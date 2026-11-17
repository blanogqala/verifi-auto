import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { db } from "./db.js";
/** Send through HTTPS when configured, or SMTP for existing deployments. */
class MailProviderError extends Error {
  constructor(public readonly code: string, public readonly responseCode: number) {
    super("Mail provider rejected delivery.");
  }
}
async function sendBrevo(row: { to: string; subject: string; body: string; html: string | null }) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
      to: [{ email: row.to }],
      subject: row.subject,
      textContent: row.body,
      ...(row.html ? { htmlContent: row.html } : {}),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    // Never log provider messages, headers, recipient addresses or verification links.
    const result = await response.json().catch(() => null);
    const code = typeof result?.code === "string" && /^[a-zA-Z0-9_]{1,48}$/.test(result.code) ? result.code : "BREVO_HTTP_ERROR";
    throw new MailProviderError(code, response.status);
  }
}
function safeFailure(error: unknown) {
  const e = error as { code?: unknown; responseCode?: unknown; name?: unknown } | null;
  return {
    code: typeof e?.code === "string" && /^[a-zA-Z0-9_]{1,48}$/.test(e.code) ? e.code : "DELIVERY_ERROR",
    responseCode: typeof e?.responseCode === "number" ? e.responseCode : undefined,
    kind: typeof e?.name === "string" && /^[a-zA-Z0-9_]{1,48}$/.test(e.name) ? e.name : undefined,
  };
}
/** Durable outbox. Retry delivery without rolling back a successful registration. */
export function startMailWorker() {
  const transport = !env.BREVO_API_KEY && env.SMTP_HOST
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        ...(env.SMTP_USER
          ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
          : {}),
      })
    : null;
  let busy = false;
  const timer = setInterval(async () => {
    if (busy || (!transport && !env.BREVO_API_KEY)) return;
    busy = true;
    try {
      const rows = await db.mailOutbox.findMany({
        where: {
          sentAt: null,
          attempts: { lt: 8 },
          availableAt: { lte: new Date() },
        },
        take: 10,
        orderBy: { createdAt: "asc" },
      });
      for (const row of rows) {
        const lease = await db.mailOutbox.updateMany({
          where: {
            id: row.id,
            attempts: row.attempts,
            availableAt: row.availableAt,
            sentAt: null,
          },
          data: {
            attempts: { increment: 1 },
            availableAt: new Date(Date.now() + 5 * 60000),
          },
        });
        if (!lease.count) continue;
        try {
          if (env.BREVO_API_KEY) await sendBrevo(row);
          else await transport!.sendMail({
            from: env.MAIL_FROM,
            to: row.to,
            subject: row.subject,
            text: row.body,
            ...(row.html ? { html: row.html } : {}),
          });
          await db.mailOutbox.update({
            where: { id: row.id },
            data: { sentAt: new Date(), body: "[Delivered]", html: null },
          });
        } catch (error) {
          console.error(JSON.stringify({
            error: "MAIL_DELIVERY_FAILED",
            outboxId: row.id,
            provider: env.BREVO_API_KEY ? "brevo-api" : "smtp",
            ...safeFailure(error),
          }));
        }
      }
      await db.rateLimit.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
      await db.accountToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
    } catch {
      console.error(JSON.stringify({ error: "MAIL_WORKER_FAILED" }));
    } finally {
      busy = false;
    }
  }, 5000);
  timer.unref();
  return () => {
    clearInterval(timer);
    transport?.close();
  };
}

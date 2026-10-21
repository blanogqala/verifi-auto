import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { db } from "./db.js";
/** Durable SMTP outbox. Retry delivery without rolling back a successful registration. */
export function startMailWorker() {
  const transport = env.SMTP_HOST
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
    if (busy || !transport) return;
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
          await transport.sendMail({
            from: env.MAIL_FROM,
            to: row.to,
            subject: row.subject,
            text: row.body,
          });
          await db.mailOutbox.update({
            where: { id: row.id },
            data: { sentAt: new Date(), body: "[Delivered]" },
          });
        } catch {
          console.error(
            JSON.stringify({ error: "MAIL_DELIVERY_FAILED", outboxId: row.id }),
          );
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

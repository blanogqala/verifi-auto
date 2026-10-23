import { db, transaction, type Tx } from "../../lib/db.js";
import {
  randomToken,
  digest,
  hashPassword,
  verifyPassword,
} from "../../lib/security.js";
import { env } from "../../config/env.js";
import { requireThat } from "../../lib/errors.js";
import { accountEmailHtml } from "../../lib/accountEmail.js";
import { announce, audit } from "../../lib/events.js";
export const publicUser = {
  id: true,
  name: true,
  email: true,
  phone: true,
  photo: true,
  emailUpdates: true,
  role: true,
  verifiedAt: true,
} as const;
export async function queueToken(
  tx: Tx,
  userId: string,
  email: string,
  purpose: "verify" | "reset",
) {
  const token = randomToken();
  await tx.accountToken.deleteMany({ where: { userId, purpose } });
  await tx.accountToken.create({
    data: {
      id: digest(token),
      userId,
      purpose,
      expiresAt: new Date(
        Date.now() + (purpose === "reset" ? 30 : 1440) * 60000,
      ),
    },
  });
  const link = `${env.WEB_ORIGIN}/#${purpose}?token=${encodeURIComponent(token)}`;
  await tx.mailOutbox.create({
    data: {
      to: email,
      subject:
        purpose === "verify"
          ? "Verify your Verifi Auto email"
          : "Reset your Verifi Auto password",
      html: accountEmailHtml(purpose, link),
      body: `Use this link to ${purpose === "verify" ? "verify your email" : "reset your password"}: ${link}\nIf you did not request this, ignore this email.`,
    },
  });
}
export async function register(input: {
  name: string;
  email: string;
  password: string;
  role: "CUSTOMER" | "MECHANIC";
}) {
  const passwordHash = await hashPassword(input.password);
  await transaction(async (tx) => {
    if (await tx.user.findUnique({ where: { email: input.email } })) return;
    const user = await tx.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        role: input.role,
        ...(input.role === "MECHANIC"
          ? { professional: { create: { name: input.name } } }
          : {}),
      },
    });
    await queueToken(tx, user.id, user.email, "verify");
    await audit(tx, user.id, "ACCOUNT_REGISTERED", user.id);
    if (input.role === "MECHANIC") {
      const professional = await tx.professional.findUniqueOrThrow({
        where: { userId: user.id },
        select: { id: true },
      });
      const admins = await tx.user.findMany({
        where: { role: "ADMIN", disabledAt: null },
        select: { id: true },
      });
      await announce(
        tx, admins.map((admin) => admin.id), "application", professional.id,
        "New mechanic registration — profile incomplete",
      );
    }
  });
}
let dummyHash: Promise<string> | undefined;
export async function login(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  dummyHash ||= hashPassword(randomToken());
  const valid = await verifyPassword(
    password,
    user?.passwordHash || (await dummyHash),
  );
  requireThat(
    valid && user && !user.disabledAt,
    401,
    "INVALID_CREDENTIALS",
    "Email or password is incorrect.",
  );
  const token = randomToken(),
    csrf = digest(`csrf:${token}`);
  const expiresAt = new Date(Date.now() + env.SESSION_HOURS * 3600000);
  await transaction(async (tx) => {
    await tx.session.create({
      data: {
        id: digest(token),
        userId: user.id,
        csrfHash: digest(csrf),
        expiresAt,
      },
    });
    await audit(tx, user.id, "SIGNED_IN", user.id);
  });
  return {
    token,
    csrf,
    expiresAt,
    user: await db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: publicUser,
    }),
  };
}
export async function consumeToken(
  token: string,
  purpose: "verify" | "reset",
  newPassword?: string,
) {
  const passwordHash = newPassword
    ? await hashPassword(newPassword)
    : undefined;
  await transaction(async (tx) => {
    const record = await tx.accountToken.findUnique({
      where: { id: digest(token) },
    });
    requireThat(
      record && record.purpose === purpose && record.expiresAt > new Date(),
      400,
      "INVALID_TOKEN",
      "This link is invalid or expired. Request a new link.",
    );
    await tx.accountToken.delete({ where: { id: record.id } });
    await tx.user.update({
      where: { id: record.userId },
      data:
        purpose === "verify" ? { verifiedAt: new Date() } : { passwordHash },
    });
    if (purpose === "reset")
      await tx.session.deleteMany({ where: { userId: record.userId } });
    await audit(
      tx,
      record.userId,
      purpose === "verify" ? "EMAIL_VERIFIED" : "PASSWORD_RESET",
      record.userId,
    );
  });
}

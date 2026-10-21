import { Router } from "express";
import { z } from "zod";
import { email, password, phone } from "../../lib/validation.js";
import { authenticate, actor } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import { db, transaction } from "../../lib/db.js";
import { env, cookieName, cookieOptions } from "../../config/env.js";
import {
  hashPassword,
  verifyPassword,
  randomToken,
  digest,
} from "../../lib/security.js";
import { requireThat } from "../../lib/errors.js";
import { audit } from "../../lib/events.js";
import * as service from "./auth.service.js";
export const authRoutes = Router();
const limit = rateLimit("auth", 15, 15);
authRoutes.post("/register", limit, async (req, res) => {
  const input = z
    .object({
      email,
      password,
      name: z.string().trim().min(2).max(120),
      role: z.enum(["CUSTOMER", "MECHANIC"]),
    })
    .strict()
    .parse(req.body);
  await service.register(input);
  res
    .status(202)
    .json({
      message:
        "If this email can be registered, a verification link will be sent. Check your inbox.",
    });
});
authRoutes.post("/login", limit, async (req, res) => {
  const input = z
    .object({ email, password: z.string().min(1).max(128) })
    .strict()
    .parse(req.body);
  const result = await service.login(input.email, input.password);
  res.cookie(cookieName, result.token, {
    ...cookieOptions,
    expires: result.expiresAt,
  });
  res.json({ user: result.user, csrf: result.csrf });
});
authRoutes.post("/forgot", limit, async (req, res) => {
  const input = z.object({ email }).strict().parse(req.body);
  const user = await db.user.findUnique({ where: { email: input.email } });
  if (user && !user.disabledAt)
    await transaction((tx) =>
      service.queueToken(tx, user.id, user.email, "reset"),
    );
  res
    .status(202)
    .json({ message: "If an account exists, a reset link will be sent." });
});
authRoutes.post("/verify", limit, async (req, res) => {
  const { token } = z
    .object({ token: z.string().min(20).max(200) })
    .strict()
    .parse(req.body);
  await service.consumeToken(token, "verify");
  res.json({ message: "Email verified. You can now sign in." });
});
authRoutes.post("/reset", limit, async (req, res) => {
  const input = z
    .object({ token: z.string().min(20).max(200), password })
    .strict()
    .parse(req.body);
  await service.consumeToken(input.token, "reset", input.password);
  res
    .clearCookie(cookieName, cookieOptions)
    .json({ message: "Password changed. Please sign in again." });
});
authRoutes.use(authenticate);
authRoutes.get("/session", async (req, res) => {
  // Deterministic per session so opening another tab does not invalidate existing forms.
  const csrf = digest(`csrf:${req.cookies[cookieName]}`);
  res.json({
    user: await db.user.findUniqueOrThrow({
      where: { id: actor(req).userId },
      select: service.publicUser,
    }),
    csrf,
  });
});
authRoutes.post("/logout", async (req, res) => {
  await transaction(async (tx) => {
    await tx.session.deleteMany({ where: { id: actor(req).sessionId } });
    await audit(tx, actor(req).userId, "SIGNED_OUT", actor(req).userId);
  });
  res.clearCookie(cookieName, cookieOptions).json({ message: "Signed out." });
});
authRoutes.post("/resend-verification", limit, async (req, res) => {
  const user = await db.user.findUniqueOrThrow({
    where: { id: actor(req).userId },
  });
  if (!user.verifiedAt)
    await transaction((tx) =>
      service.queueToken(tx, user.id, user.email, "verify"),
    );
  res.json({ message: "Verification email requested." });
});
authRoutes.patch("/profile", async (req, res) => {
  const input = z
    .object({ name: z.string().trim().min(2).max(120), phone })
    .strict()
    .parse(req.body);
  res.json(
    await db.user.update({
      where: { id: actor(req).userId },
      data: input,
      select: service.publicUser,
    }),
  );
});
authRoutes.post("/password", limit, async (req, res) => {
  const input = z
    .object({ currentPassword: z.string().max(128), password })
    .strict()
    .parse(req.body);
  const user = await db.user.findUniqueOrThrow({
    where: { id: actor(req).userId },
  });
  requireThat(
    await verifyPassword(input.currentPassword, user.passwordHash),
    400,
    "INVALID_PASSWORD",
    "Current password is incorrect.",
  );
  const passwordHash = await hashPassword(input.password);
  await transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await audit(tx, user.id, "PASSWORD_CHANGED", user.id);
  });
  res
    .clearCookie(cookieName, cookieOptions)
    .json({ message: "Password changed. Please sign in again." });
});

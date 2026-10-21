import type { RequestHandler, Request } from "express";
import { db } from "../lib/db.js";
import { cookieName } from "../config/env.js";
import { digest } from "../lib/security.js";
import { requireThat } from "../lib/errors.js";
import type { Role } from "../generated/prisma/client.js";
export const authenticate: RequestHandler = async (req, _res, next) => {
  const raw = req.cookies?.[cookieName];
  requireThat(
    typeof raw === "string" && raw.length < 200,
    401,
    "UNAUTHENTICATED",
    "Please sign in.",
  );
  const session = await db.session.findUnique({
    where: { id: digest(raw) },
    include: { user: { include: { professional: { select: { id: true } } } } },
  });
  requireThat(
    session && session.expiresAt > new Date() && !session.user.disabledAt,
    401,
    "UNAUTHENTICATED",
    "Your session has ended. Please sign in.",
  );
  req.auth = {
    userId: session.userId,
    role: session.user.role,
    sessionId: session.id,
    verified: !!session.user.verifiedAt,
    professionalId: session.user.professional?.id || null,
  };
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const csrf = req.get("X-CSRF-Token");
    requireThat(
      csrf && digest(csrf) === session.csrfHash,
      403,
      "CSRF",
      "Reload the page before trying again.",
    );
  }
  next();
};
export const verified: RequestHandler = (req, _res, next) => {
  requireThat(
    req.auth?.verified,
    403,
    "EMAIL_UNVERIFIED",
    "Verify your email before continuing.",
  );
  next();
};
export const roles =
  (...allowed: Role[]): RequestHandler =>
  (req, _res, next) => {
    requireThat(
      req.auth && allowed.includes(req.auth.role),
      403,
      "FORBIDDEN",
      "This action is not available for your account.",
    );
    next();
  };
export const actor = (req: Request) => {
  requireThat(req.auth, 401, "UNAUTHENTICATED", "Please sign in.");
  return req.auth;
};

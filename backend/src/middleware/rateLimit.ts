import type { RequestHandler } from "express";
import { db } from "../lib/db.js";
import { digest } from "../lib/security.js";
import { ApiError } from "../lib/errors.js";
/** DB-backed, fixed-window limit shared across API processes. Keys never contain raw email/IP. */
export function rateLimit(
  scope: string,
  max: number,
  minutes: number,
): RequestHandler {
  return async (req, res, next) => {
    const bucket = Math.floor(Date.now() / (minutes * 60000));
    const key = digest(`${scope}:${req.auth?.userId || req.ip}:${bucket}`);
    const row = await db.rateLimit.upsert({
      where: { key },
      create: { key, expiresAt: new Date((bucket + 1) * minutes * 60000) },
      update: { count: { increment: 1 } },
    });
    if (row.count > max) {
      res.setHeader(
        "Retry-After",
        String(Math.ceil((row.expiresAt.getTime() - Date.now()) / 1000)),
      );
      throw new ApiError(
        429,
        "RATE_LIMITED",
        "Too many attempts. Please wait and try again.",
      );
    }
    next();
  };
}

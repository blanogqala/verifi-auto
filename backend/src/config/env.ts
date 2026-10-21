import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//),
  WEB_ORIGIN: z.url().default("http://localhost:5173"),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false"),
  SESSION_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(3).default(0),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  MAIL_FROM: z.string().default("Verifi Auto <noreply@example.com>"),
  ENABLE_TEST_PAYMENTS: z.enum(["true", "false"]).default("false"),
});
export const env = schema.parse(process.env);
if (
  env.NODE_ENV === "production" &&
  (env.COOKIE_SECURE !== "true" ||
    !env.WEB_ORIGIN.startsWith("https://") ||
    env.ENABLE_TEST_PAYMENTS === "true" ||
    !env.SMTP_HOST)
) {
  throw Error(
    "Production requires secure cookies, HTTPS WEB_ORIGIN, SMTP, and disabled test payments.",
  );
}
export const cookieName =
  env.COOKIE_SECURE === "true" ? "__Host-verifi_session" : "verifi_session";
export const cookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE === "true",
  sameSite: "lax" as const,
  path: "/",
};

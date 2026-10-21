import { db } from "../../lib/db.js";
import { hashPassword } from "../../lib/security.js";
import { email, password } from "../../lib/validation.js";
// Operator-only. Supply via environment/secret manager; never command-line arguments.
const address = email.parse(process.env.ADMIN_EMAIL);
const secret = password.parse(process.env.ADMIN_PASSWORD);
const name = process.env.ADMIN_NAME?.trim() || "Platform administrator";
try {
  await db.user.create({
    data: {
      email: address,
      passwordHash: await hashPassword(secret),
      name,
      role: "ADMIN",
      verifiedAt: new Date(),
    },
  });
  console.log(
    "Administrator created. Remove the temporary ADMIN_PASSWORD environment variable.",
  );
} finally {
  await db.$disconnect();
}

/**
 * Throwaway API for browser tests. It never reads the developer DATABASE_URL:
 * environment is set before the application modules load, and dotenv does not override it.
 */
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const port = 15440;
const pg = await PGlite.create();
const migrationsUrl = new URL("../prisma/migrations/", import.meta.url);
const names = (await readdir(migrationsUrl, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const migration = (
  await Promise.all(
    names.map((name) => readFile(new URL(`${name}/migration.sql`, migrationsUrl), "utf8")),
  )
).join("\n");
await pg.exec(migration);
const socket = new PGLiteSocketServer({ db: pg, port, host: "127.0.0.1", maxConnections: 12 });
await socket.start();

process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
process.env.WEB_ORIGIN = "http://127.0.0.1:5199";
process.env.NODE_ENV = "test";
process.env.ENABLE_TEST_PAYMENTS = "false";
process.env.COOKIE_SECURE = "false";
process.env.PORT = "3099";

const { app } = await import("../src/app.js");
const { db } = await import("../src/lib/db.js");
const { hashPassword } = await import("../src/lib/security.js");

await db.user.create({
  data: {
    name: "Approved Mechanic",
    email: "mechanic@example.test",
    role: "MECHANIC",
    passwordHash: await hashPassword("StrongExample9!"),
    verifiedAt: new Date(),
    professional: {
      create: {
        name: "Approved Workshop",
        type: "Workshop",
        city: "Cape Town",
        address: "1 Test Street",
        about: "Approved for the disposable browser test.",
        services: ["Brakes"],
        phone: "0712345678",
        latitude: -33.9249,
        longitude: 18.4241,
        status: "APPROVED",
      },
    },
  },
});

const httpServer = app.listen(3099, "127.0.0.1", () => {
  console.log("DISPOSABLE_API_READY");
});

async function stop() {
  await new Promise((resolve) => httpServer.close(() => resolve(undefined)));
  await db.$disconnect();
  await socket.stop();
  await pg.close();
  process.exit(0);
}
process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());

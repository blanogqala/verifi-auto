import { app } from "./app.js";
import { db } from "./lib/db.js";
import { env } from "./config/env.js";
import { startMailWorker } from "./lib/mail.js";
await db.$connect();
const stopMail = startMailWorker();
const server = app.listen(env.PORT, "0.0.0.0", () =>
  console.log(`Verifi Auto API listening on port ${env.PORT}`),
);
server.requestTimeout = 30000;
const stop = () => {
  stopMail();
  server.close(() => void db.$disconnect().then(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.once("SIGTERM", stop);
process.once("SIGINT", stop);

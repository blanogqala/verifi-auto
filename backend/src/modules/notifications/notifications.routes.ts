import { Router } from "express";
import { z } from "zod";
import { db } from "../../lib/db.js";
import { actor } from "../../middleware/auth.js";
import { requireThat } from "../../lib/errors.js";
import { takeQuery } from "../../lib/validation.js";
export const notificationRoutes = Router();
const connections = new Map<string, number>();
const cursor = z
  .string()
  .regex(/^\d{1,18}$/)
  .transform(BigInt);
const serialise = <T extends { id: bigint }>(row: T) => ({
  ...row,
  id: row.id.toString(),
});
notificationRoutes.get("/", async (req, res) => {
  const query = z
    .object({ take: takeQuery, before: cursor.optional() })
    .parse(req.query);
  res.json(
    (
      await db.notification.findMany({
        where: {
          userId: actor(req).userId,
          ...(query.before !== undefined ? { id: { lt: query.before } } : {}),
        },
        orderBy: { id: "desc" },
        take: query.take,
      })
    ).map(serialise),
  );
});
notificationRoutes.post("/read", async (req, res) => {
  const { ids } = z
    .object({ ids: z.array(cursor).max(100) })
    .strict()
    .parse(req.body);
  await db.notification.updateMany({
    where: { id: { in: ids }, userId: actor(req).userId },
    data: { readAt: new Date() },
  });
  res.json({ message: "Notifications marked read." });
});
/** Durable per-user event stream works across API processes; reconnect refetches current resources. */
notificationRoutes.get("/stream", async (req, res) => {
  let after = cursor.parse(req.get("Last-Event-ID") || req.query.after || "0");
  const sessionId = actor(req).sessionId;
  requireThat(
    (connections.get(sessionId) || 0) < 5,
    429,
    "STREAM_LIMIT",
    "Too many open tabs. Close an unused tab.",
  );
  connections.set(sessionId, (connections.get(sessionId) || 0) + 1);
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("retry: 3000\n\n");
  let closed = false,
    busy = false;
  const poll = async () => {
    if (closed || busy) return;
    busy = true;
    try {
      const session = await db.session.findUnique({
        where: { id: actor(req).sessionId },
        include: { user: { select: { disabledAt: true } } },
      });
      if (
        !session ||
        session.expiresAt < new Date() ||
        session.user.disabledAt
      ) {
        res.write("event: session-ended\ndata: {}\n\n");
        res.end();
        return;
      }
      const events = await db.notification.findMany({
        where: { userId: actor(req).userId, id: { gt: after } },
        orderBy: { id: "asc" },
        take: 100,
      });
      for (const event of events) {
        if (closed) break;
        after = event.id;
        if (
          !res.write(
            `id: ${event.id}\nevent: update\ndata: ${JSON.stringify(serialise(event))}\n\n`,
          )
        ) {
          res.end();
          break;
        }
      }
      if (!events.length) res.write(": heartbeat\n\n");
    } catch {
      res.end();
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(() => void poll(), 2000);
  req.on("close", () => {
    closed = true;
    clearInterval(timer);
    const count = (connections.get(sessionId) || 1) - 1;
    if (count) connections.set(sessionId, count);
    else connections.delete(sessionId);
  });
  await poll();
});

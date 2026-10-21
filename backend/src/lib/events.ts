import type { Tx } from "./db.js";
export async function announce(
  tx: Tx,
  users: string[],
  topic: string,
  resourceId: string,
  title: string,
) {
  await tx.notification.createMany({
    data: [...new Set(users)].map((userId) => ({
      userId,
      topic,
      resourceId,
      title,
    })),
  });
}
export async function audit(
  tx: Tx,
  actorId: string,
  action: string,
  resourceId: string,
  details: Record<string, string | number | boolean> = {},
) {
  await tx.auditLog.create({ data: { actorId, action, resourceId, details } });
}

import { Router } from "express";
import { z } from "zod";
import { db, transaction } from "../../lib/db.js";
import { roles, actor, verified } from "../../middleware/auth.js";
import { id, expectedVersion, takeQuery } from "../../lib/validation.js";
import { requireThat } from "../../lib/errors.js";
import { announce, audit } from "../../lib/events.js";
import { publicUser } from "../auth/auth.service.js";
export const adminRoutes = Router();
adminRoutes.use(roles("ADMIN"), verified);
adminRoutes.get("/overview", async (_req, res) => {
  const [customers, professionals, applications, bookings, payments] =
    await Promise.all([
      db.user.count({ where: { role: "CUSTOMER" } }),
      db.professional.count({ where: { status: "APPROVED" } }),
      db.professional.count({ where: { status: "SUBMITTED" } }),
      db.booking.groupBy({ by: ["status"], _count: true }),
      db.payment.aggregate({
        where: { provider: { not: "TEST" } },
        _sum: { amountCents: true },
      }),
    ]);
  res.json({
    customers,
    professionals,
    applications,
    bookings,
    confirmedPaymentCents: payments._sum.amountCents || 0,
  });
});
adminRoutes.get("/applications", async (req, res) =>
  res.json(
    await db.professional.findMany({
      where: { status: "SUBMITTED" },
      take: takeQuery.parse(req.query.take),
      orderBy: { updatedAt: "asc" },
    }),
  ),
);
adminRoutes.get("/professionals", async (req, res) => {
  const rows = await db.professional.findMany({
    where: { status: { in: ["APPROVED", "SUSPENDED"] } },
    include: { user: { select: { email: true, disabledAt: true } } },
    take: takeQuery.parse(req.query.take),
    orderBy: { name: "asc" },
  });
  res.json(
    rows.map(({ user, ...p }) => ({
      ...p,
      email: user.email,
      disabledAt: user.disabledAt,
    })),
  );
});
adminRoutes.get("/application-history", async (req, res) =>
  res.json(
    await db.professional.findMany({
      where: { status: { in: ["CHANGES_REQUESTED", "APPROVED", "SUSPENDED"] } },
      take: takeQuery.parse(req.query.take),
      orderBy: { updatedAt: "desc" },
    }),
  ),
);
adminRoutes.get("/users/:id", async (req, res) => {
  const user = await db.user.findUnique({
    where: { id: id.parse(req.params.id) },
    select: { ...publicUser, disabledAt: true, createdAt: true },
  });
  requireThat(
    user && user.role !== "ADMIN",
    404,
    "NOT_FOUND",
    "Account not found.",
  );
  res.json(user);
});
adminRoutes.get("/professionals/:id", async (req, res) => {
  const pro = await db.professional.findUnique({
    where: { id: id.parse(req.params.id) },
    include: {
      user: {
        select: {
          ...publicUser,
          documents: {
            select: {
              id: true,
              kind: true,
              name: true,
              mime: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });
  requireThat(pro, 404, "NOT_FOUND", "Professional not found.");
  res.json(pro);
});
adminRoutes.post("/professionals/:id/review", async (req, res) => {
  const input = z
    .object({
      status: z.enum(["APPROVED", "CHANGES_REQUESTED", "SUSPENDED"]),
      note: z.string().trim().min(3).max(2000),
      version: expectedVersion,
    })
    .strict()
    .parse(req.body);
  const result = await transaction(async (tx) => {
    const pro = await tx.professional.findUnique({
      where: { id: id.parse(req.params.id) },
      include: { user: { select: { verifiedAt: true } } },
    });
    requireThat(pro, 404, "NOT_FOUND", "Professional not found.");
    requireThat(
      pro.version === input.version,
      409,
      "CONFLICT",
      "Application changed. Review it again.",
    );
    requireThat(
      input.status === "SUSPENDED"
        ? pro.status === "APPROVED"
        : pro.status === "SUBMITTED" && pro.user.verifiedAt,
      409,
      "INVALID_STATE",
      "Review a submitted application with a verified email.",
    );
    const updated = await tx.professional.update({
      where: { id: pro.id },
      data: {
        status: input.status,
        reviewNote: input.note,
        version: { increment: 1 },
        ...(input.status === "APPROVED" && !pro.credentialId
          ? { credentialId: `VA-${crypto.randomUUID()}` }
          : {}),
      },
    });
    await announce(
      tx,
      [pro.userId],
      "application",
      pro.id,
      `Application ${input.status.toLowerCase().replaceAll("_", " ")}`,
    );
    await audit(tx, actor(req).userId, "APPLICATION_REVIEWED", pro.id, {
      status: input.status,
      note: input.note,
    });
    return updated;
  });
  res.json(result);
});
adminRoutes.get("/users", async (req, res) => {
  const query = z
    .object({
      role: z.enum(["CUSTOMER", "MECHANIC"]).optional(),
      take: takeQuery,
      cursor: id.optional(),
    })
    .parse(req.query);
  res.json(
    await db.user.findMany({
      where: { ...(query.role ? { role: query.role } : {}) },
      select: { ...publicUser, disabledAt: true, createdAt: true },
      take: query.take,
      orderBy: { id: "asc" },
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    }),
  );
});
adminRoutes.post("/users/:id/status", async (req, res) => {
  const userId = id.parse(req.params.id),
    { disabled } = z.object({ disabled: z.boolean() }).strict().parse(req.body);
  requireThat(
    userId !== actor(req).userId,
    409,
    "SELF_DISABLE",
    "You cannot disable your own account.",
  );
  await transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    requireThat(
      user && user.role !== "ADMIN",
      403,
      "FORBIDDEN",
      "Administrator accounts require operator management.",
    );
    await tx.user.update({
      where: { id: userId },
      data: { disabledAt: disabled ? new Date() : null },
    });
    if (disabled) await tx.session.deleteMany({ where: { userId } });
    await audit(
      tx,
      actor(req).userId,
      disabled ? "ACCOUNT_DISABLED" : "ACCOUNT_ENABLED",
      userId,
    );
  });
  res.json({ message: "Account updated." });
});
adminRoutes.get("/activity", async (req, res) =>
  res.json(
    await db.auditLog.findMany({
      where: req.query.resourceId
        ? { resourceId: id.parse(req.query.resourceId) }
        : {},
      take: takeQuery.parse(req.query.take),
      orderBy: { createdAt: "desc" },
    }),
  ),
);

// An operator must have a licensed, verified asset before registering it here. No guessed models.
adminRoutes.post("/vehicle-assets", async (req, res) => {
  const httpsUrl = z
    .url()
    .refine((value) => value.startsWith("https://"), "Use an HTTPS asset URL.");
  const input = z
    .object({
      make: z.string().trim().min(1).max(80),
      model: z.string().trim().min(1).max(100),
      variant: z.string().trim().max(100),
      yearFrom: z.number().int().min(1900).max(2200),
      yearTo: z.number().int().min(1900).max(2200),
      modelUrl: httpsUrl,
      previewUrl: httpsUrl.optional(),
      sourceUrl: httpsUrl,
      licence: z.string().trim().min(3).max(300),
      attribution: z.string().trim().min(3).max(500),
      paintMaterials: z.array(z.string().max(100)).max(30).default([]),
      accuracyConfirmed: z.literal(true),
      licenceConfirmed: z.literal(true),
    })
    .strict()
    .refine((value) => value.yearFrom <= value.yearTo)
    .parse(req.body);
  const {
    accuracyConfirmed: _accuracy,
    licenceConfirmed: _licence,
    ...asset
  } = input;
  const result = await transaction(async (tx) => {
    const row = await tx.vehicleAsset.create({
      data: { ...asset, verifiedAt: new Date() },
    });
    await audit(tx, actor(req).userId, "VEHICLE_ASSET_VERIFIED", row.id);
    return row;
  });
  res.status(201).json(result);
});

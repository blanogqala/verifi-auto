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
// List registrations immediately; only SUBMITTED applications can be approved.
// Include metadata for the reviewer, never password hashes or document file bytes.
adminRoutes.get("/applications", async (req, res) =>
  res.json(
    await db.professional.findMany({
      where: { status: { in: ["DRAFT", "SUBMITTED"] } },
      include: {
        user: {
          select: {
            name: true, email: true, verifiedAt: true, createdAt: true, disabledAt: true,
            documents: {
              select: { id: true, kind: true, name: true, mime: true, reviewStatus: true, reviewNote: true, reviewedAt: true, createdAt: true },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
      take: takeQuery.parse(req.query.take),
      orderBy: { updatedAt: "desc" },
    }),
  ),
);
adminRoutes.get("/professionals", async (req, res) => {
  const rows = await db.professional.findMany({
    where: { status: { in: ["APPROVED", "SUSPENDED"] } },
    include: {
      user: { select: {
        email: true, disabledAt: true, verifiedAt: true,
        documents: { select: { id: true, kind: true, name: true, mime: true, reviewStatus: true, reviewNote: true, reviewedAt: true, createdAt: true } },
      } },
    },
    take: takeQuery.parse(req.query.take),
    orderBy: { name: "asc" },
  });
  res.json(
    rows.map(({ user, ...p }) => ({
      ...p,
      email: user.email,
      disabledAt: user.disabledAt,
      documents: user.documents,
      user: { verifiedAt: user.verifiedAt },
    })),
  );
});
adminRoutes.get("/application-history", async (req, res) =>
  res.json(
    await db.professional.findMany({
      where: { status: { in: ["CHANGES_REQUESTED", "APPROVED", "SUSPENDED"] } },
      include: {
        user: { select: {
          email: true, verifiedAt: true,
          documents: { select: { id: true, kind: true, name: true, mime: true, reviewStatus: true, reviewNote: true, reviewedAt: true, createdAt: true } },
        } },
      },
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
// Admin-only customer details: read from the customer's own records, not the
// global 100-booking dashboard snapshot. Historical counts are unbounded;
// individual lists are bounded and clearly labelled in the UI.
adminRoutes.get("/customers/:id", async (req, res) => {
  const customerId = id.parse(req.params.id);
  const customer = await db.user.findFirst({
    where: { id: customerId, role: "CUSTOMER" },
    select: {
      id: true, name: true, email: true, phone: true, photo: true,
      verifiedAt: true, disabledAt: true, createdAt: true,
    },
  });
  requireThat(customer, 404, "NOT_FOUND", "Customer not found.");
  const [vehicles, bookingStatuses, bookingTotal, vehicleTotal, bookings, payments] =
    await Promise.all([
      db.vehicle.findMany({
        where: { customerId },
        select: {
          id: true, make: true, model: true, year: true, variant: true,
          registration: true, mileage: true, paintColorName: true, bodyStyle: true,
          archivedAt: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.booking.groupBy({
        by: ["status"], where: { customerId }, _count: { _all: true },
      }),
      db.booking.count({ where: { customerId } }),
      db.vehicle.count({ where: { customerId } }),
      db.booking.findMany({
        where: { customerId },
        select: {
          id: true, status: true, description: true, appointmentAt: true,
          createdAt: true,
          professional: { select: { name: true } },
          vehicle: { select: { make: true, model: true, year: true, registration: true } },
          quotes: { select: { payment: { select: { amountCents: true, provider: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.payment.aggregate({
        where: { provider: { not: "TEST" }, quote: { booking: { customerId } } },
        _sum: { amountCents: true },
      }),
    ]);
  const counts = Object.fromEntries(bookingStatuses.map((item) => [item.status, item._count._all]));
  res.json({
    customer,
    vehicleTotal,
    vehicles,
    bookingTotal,
    bookingCounts: {
      completed: counts.COMPLETED || 0,
      active: bookingTotal - (counts.COMPLETED || 0) - (counts.CANCELLED || 0) - (counts.REJECTED || 0),
      stopped: (counts.CANCELLED || 0) + (counts.REJECTED || 0),
    },
    confirmedPaidCents: payments._sum.amountCents || 0,
    bookings: bookings.map((row) => ({
      id: row.id,
      status: row.status,
      description: row.description,
      appointmentAt: row.appointmentAt,
      createdAt: row.createdAt,
      professional: row.professional.name,
      vehicle: row.vehicle,
      confirmedPaidCents: row.quotes.reduce(
        (sum, q) => sum + (q.payment && q.payment.provider !== "TEST" ? q.payment.amountCents : 0), 0,
      ),
    })),
  });
});

// Deliberately non-cascading deletion. Vehicle records, messages, bookings and
// service/review history must not disappear with an admin click.
adminRoutes.delete("/customers/:id", async (req, res) => {
  const customerId = id.parse(req.params.id);
  await transaction(async (tx) => {
    const customer = await tx.user.findFirst({
      where: { id: customerId, role: "CUSTOMER" },
      select: { id: true },
    });
    requireThat(customer, 404, "NOT_FOUND", "Customer not found.");
    const [vehicles, bookings, messages, reviews, documents] = await Promise.all([
      tx.vehicle.count({ where: { customerId } }),
      tx.booking.count({ where: { customerId } }),
      tx.message.count({ where: { authorId: customerId } }),
      tx.review.count({ where: { customerId } }),
      tx.document.count({ where: { userId: customerId } }),
    ]);
    requireThat(
      vehicles + bookings + messages + reviews + documents === 0,
      409, "CUSTOMER_HAS_HISTORY",
      "This customer has linked vehicles, bookings or historical records. Disable the account instead of deleting it.",
    );
    // Session, reset tokens and notifications have explicit onDelete: Cascade.
    await tx.user.delete({ where: { id: customerId } });
    await audit(tx, actor(req).userId, "CUSTOMER_DELETED", customerId);
  });
  res.json({ message: "Customer account deleted." });
});
adminRoutes.get("/professionals/:id", async (req, res) => {
  const pro = await db.professional.findUnique({
    where: { id: id.parse(req.params.id) },
    include: {
      reviews: {
        select: { id: true, rating: true, body: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      user: {
        select: {
          ...publicUser, disabledAt: true, createdAt: true,
          documents: {
            select: {
              id: true,
              kind: true,
              name: true,
              mime: true,
              reviewStatus: true,
              reviewNote: true,
              reviewedAt: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });
  requireThat(pro, 404, "NOT_FOUND", "Professional not found.");
  const [bookingTotal, statuses, paid, recentBookings] = await Promise.all([
    db.booking.count({ where: { professionalId: pro.id } }),
    db.booking.groupBy({
      by: ["status"], where: { professionalId: pro.id }, _count: { _all: true },
    }),
    db.payment.aggregate({
      where: { provider: { not: "TEST" }, quote: { booking: { professionalId: pro.id } } },
      _sum: { amountCents: true },
    }),
    db.booking.findMany({
      where: { professionalId: pro.id },
      select: {
        id: true, status: true, appointmentAt: true, description: true,
        vehicle: { select: { year: true, make: true, model: true, registration: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  const count = Object.fromEntries(statuses.map(x => [x.status, x._count._all]));
  res.json({
    ...pro,
    bookingTotal,
    bookingCounts: {
      active: bookingTotal - (count.COMPLETED || 0) - (count.CANCELLED || 0) - (count.REJECTED || 0),
      completed: count.COMPLETED || 0,
      stopped: (count.CANCELLED || 0) + (count.REJECTED || 0),
    },
    // Customer money received; not mechanic payout or net take-home earnings.
    recordedGrossRevenueCents: paid._sum.amountCents || 0,
    recentBookings,
  });
});

// Delete only an unencumbered mechanic account. Never cascade into verified
// evidence, transactions, jobs, messages, reviews, or service history.
adminRoutes.delete("/professionals/:id", async (req, res) => {
  const professionalId = id.parse(req.params.id);
  await transaction(async (tx) => {
    const pro = await tx.professional.findUnique({
      where: { id: professionalId },
      select: { id: true, userId: true, user: { select: { role: true } } },
    });
    requireThat(pro && pro.user.role === "MECHANIC", 404, "NOT_FOUND", "Professional not found.");
    const [bookings, reviews, documents, messages] = await Promise.all([
      tx.booking.count({ where: { professionalId } }),
      tx.review.count({ where: { professionalId } }),
      tx.document.count({ where: { userId: pro.userId } }),
      tx.message.count({ where: { authorId: pro.userId } }),
    ]);
    requireThat(
      bookings + reviews + documents + messages === 0,
      409, "PROFESSIONAL_HAS_HISTORY",
      "This professional has bookings, verification documents or service history. Block the account instead of deleting it.",
    );
    await tx.professional.delete({ where: { id: professionalId } });
    await tx.user.delete({ where: { id: pro.userId } });
    await audit(tx, actor(req).userId, "PROFESSIONAL_DELETED", professionalId);
  });
  res.json({ message: "Professional account deleted." });
});
// Each piece of evidence is reviewed individually and audited.
adminRoutes.post("/documents/:id/review", async (req, res) => {
  const input = z.object({
    decision: z.enum(["APPROVED", "CHANGES_REQUESTED"]),
    note: z.string().trim().max(1000).default(""),
    previousStatus: z.enum(["PENDING", "APPROVED", "CHANGES_REQUESTED"]),
  }).strict().refine(
    (value) => value.decision !== "CHANGES_REQUESTED" || value.note.length >= 3,
    "Explain the correction the mechanic needs to make.",
  ).parse(req.body);
  const result = await transaction(async (tx) => {
    const doc = await tx.document.findUnique({
      where: { id: id.parse(req.params.id) },
      include: { user: { select: { professional: true } } },
    });
    const professional = doc?.user.professional;
    requireThat(doc && professional, 404, "NOT_FOUND", "Evidence not found.");
    requireThat(professional.status === "SUBMITTED", 409, "INVALID_STATE", "Only submitted evidence can be reviewed.");
    const updated = await tx.document.updateMany({
      where: { id: doc.id, reviewStatus: input.previousStatus },
      data: {
        reviewStatus: input.decision,
        reviewNote: input.note,
        reviewedAt: new Date(),
      },
    });
    requireThat(updated.count === 1, 409, "CONFLICT", "This document changed. Reload it before reviewing.");
    if (input.decision === "CHANGES_REQUESTED") {
      await tx.professional.update({
        where: { id: professional.id },
        data: {
          status: "CHANGES_REQUESTED",
          reviewNote: `${doc.kind}: ${input.note}`,
          version: { increment: 1 },
        },
      });
    }
    await announce(tx, [doc.userId], "application", professional.id,
      input.decision === "APPROVED" ? "A document was approved" : `Document needs changes: ${doc.kind}`);
    await audit(tx, actor(req).userId, "DOCUMENT_REVIEWED", doc.id, {
      decision: input.decision, note: input.note,
    });
    return tx.document.findUniqueOrThrow({
      where: { id: doc.id },
      select: { id: true, kind: true, reviewStatus: true, reviewNote: true, reviewedAt: true },
    });
  });
  res.json(result);
});
// Deleting submitted evidence always returns the application to changes requested.
adminRoutes.delete("/documents/:id", async (req, res) => {
  const { note } = z.object({
    note: z.string().trim().min(3).max(1000),
  }).strict().parse(req.body);
  await transaction(async (tx) => {
    const doc = await tx.document.findUnique({
      where: { id: id.parse(req.params.id) },
      include: { user: { select: { professional: true } } },
    });
    const professional = doc?.user.professional;
    requireThat(doc && professional, 404, "NOT_FOUND", "Evidence not found.");
    requireThat(professional.status === "SUBMITTED", 409, "INVALID_STATE", "Evidence can only be removed during a submitted review.");
    await tx.document.delete({ where: { id: doc.id } });
    await tx.professional.update({
      where: { id: professional.id },
      data: {
        status: "CHANGES_REQUESTED",
        reviewNote: `Removed ${doc.kind} evidence: ${note}`,
        version: { increment: 1 },
      },
    });
    await announce(tx, [doc.userId], "application", professional.id, "Document removed — replacement required");
    await audit(tx, actor(req).userId, "DOCUMENT_REMOVED_BY_ADMIN", doc.id, { note, kind: doc.kind });
  });
  res.status(204).end();
});
adminRoutes.post("/professionals/:id/review", async (req, res) => {
  const input = z
    .object({
      status: z.enum(["APPROVED", "CHANGES_REQUESTED", "SUSPENDED"]),
      note: z.string().trim().max(2000),
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
    if (input.status === "APPROVED") {
      const docs = await tx.document.findMany({
        where: { userId: pro.userId },
        select: { kind: true, reviewStatus: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
      requireThat(
        ["IDENTITY", "QUALIFICATION"].every((kind) => docs.find((doc) => doc.kind === kind)?.reviewStatus === "APPROVED"),
        422,
        "EVIDENCE_NOT_APPROVED",
        "Approve the identity and qualifications documents before approving the application.",
      );
    } else {
      requireThat(input.note.length >= 3, 422, "REVIEW_NOTE_REQUIRED", "Explain the requested changes or suspension.");
    }
    const decisionNote = input.note || "Profile and required evidence approved.";
    const updated = await tx.professional.update({
      where: { id: pro.id },
      data: {
        status: input.status,
        reviewNote: decisionNote,
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
      note: decisionNote,
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

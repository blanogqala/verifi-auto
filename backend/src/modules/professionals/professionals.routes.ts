import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { db, transaction } from "../../lib/db.js";
import { actor, roles, verified } from "../../middleware/auth.js";
import { id, phone, expectedVersion, takeQuery } from "../../lib/validation.js";
import { requireThat } from "../../lib/errors.js";
import { announce, audit } from "../../lib/events.js";
export const professionalPublicSelect = {
  id: true,
  name: true,
  type: true,
  city: true,
  address: true,
  about: true,
  services: true,
  phone: true,
  website: true,
  latitude: true,
  longitude: true,
  credentialId: true,
  user: { select: { photo: true } },
} as const;
export const directoryRoutes = Router();
directoryRoutes.get("/", async (req, res) => {
  const query = z
    .object({
      city: z.string().max(100).optional(),
      service: z.string().max(100).optional(),
      type: z.enum(["Workshop", "Mobile mechanic"]).optional(),
      take: takeQuery,
      cursor: id.optional(),
    })
    .parse(req.query);
  const rows = await db.professional.findMany({
    where: {
      status: "APPROVED",
      user: { disabledAt: null },
      ...(query.city
        ? { city: { contains: query.city, mode: "insensitive" } }
        : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.service ? { services: { has: query.service } } : {}),
    },
    select: professionalPublicSelect,
    orderBy: { id: "asc" },
    take: query.take,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const ratings = await db.review.groupBy({
    by: ["professionalId"],
    where: { professionalId: { in: rows.map((r) => r.id) } },
    _avg: { rating: true },
    _count: true,
  });
  res.json(
    rows.map(({ user, ...row }) => ({
      ...row,
      photo: user.photo,
      rating:
        ratings.find((r) => r.professionalId === row.id)?._avg.rating || null,
      reviewCount:
        ratings.find((r) => r.professionalId === row.id)?._count || 0,
    })),
  );
});
directoryRoutes.get("/:id", async (req, res) => {
  const row = await db.professional.findFirst({
    where: {
      id: id.parse(req.params.id),
      status: "APPROVED",
      user: { disabledAt: null },
    },
    select: professionalPublicSelect,
  });
  requireThat(row, 404, "NOT_FOUND", "Professional not found.");
  const reviews = await db.review.findMany({
    where: { professionalId: row.id },
    select: {
      id: true,
      body: true,
      rating: true,
      createdAt: true,
      customer: { select: { name: true } },
    },
    take: 30,
    orderBy: { createdAt: "desc" },
  });
  const summary = await db.review.aggregate({
    where: { professionalId: row.id },
    _avg: { rating: true },
    _count: true,
  });
  const { user, ...publicRow } = row;
  res.json({
    ...publicRow,
    photo: user.photo,
    rating: summary._avg.rating,
    reviewCount: summary._count,
    reviews: reviews.map(({ customer, ...review }) => ({
      ...review,
      customerName: customer.name.split(" ")[0],
    })),
  });
});
const profile = z
  .object({
    name: z.string().trim().min(2).max(160),
    type: z.enum(["Workshop", "Mobile mechanic"]),
    city: z.string().trim().min(2).max(100),
    address: z.string().trim().max(300),
    about: z.string().trim().min(10).max(4000),
    services: z.array(z.string().trim().min(2).max(100)).min(1).max(30)
      .refine((value) => new Set(value.map((v) => v.toLowerCase())).size === value.length, "Services must be unique."),
    serviceAreas: z.array(z.string().trim().min(2).max(100)).min(1).max(25).optional()
      .refine((value) => !value || new Set(value.map((v) => v.toLowerCase())).size === value.length, "Service areas must be unique."),
    phone,
    website: z.union([
      z.literal(""),
      z.url().refine((s) => /^https?:\/\//.test(s)),
    ]),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    version: expectedVersion,
  })
  .strict()
  .refine(
    (value) => (value.latitude === null) === (value.longitude === null),
    "Provide both coordinates or leave both empty.",
  );
export const professionalRoutes = Router();
professionalRoutes.use(roles("MECHANIC"), verified);
professionalRoutes.get("/me", async (req, res) =>
  res.json(
    await db.professional.findUniqueOrThrow({
      where: { userId: actor(req).userId },
    }),
  ),
);
professionalRoutes.patch("/me", async (req, res) => {
  const { version, ...input } = profile.parse(req.body);
  const result = await transaction(async (tx) => {
    const pro = await tx.professional.findUniqueOrThrow({
      where: { userId: actor(req).userId },
    });
    requireThat(
      pro.version === version && pro.status !== "SUSPENDED",
      409,
      "CONFLICT",
      "Profile changed or is suspended. Reload it.",
    );
    // Identity/business changes require another review; approval cannot be retained by client input.
    const updated = await tx.professional.update({
      where: { id: pro.id },
      data: {
        ...input,
        serviceAreas: input.serviceAreas?.length ? input.serviceAreas : [input.city],
        status: "DRAFT",
        version: { increment: 1 },
      },
    });
    await audit(tx, actor(req).userId, "PROFESSIONAL_UPDATED", pro.id);
    return updated;
  });
  res.json(result);
});
professionalRoutes.post("/me/submit", async (req, res) => {
  const result = await transaction(async (tx) => {
    const pro = await tx.professional.findUniqueOrThrow({
      where: { userId: actor(req).userId },
    });
    requireThat(
      ["DRAFT", "CHANGES_REQUESTED"].includes(pro.status),
      409,
      "INVALID_STATE",
      "Application cannot be submitted at this stage.",
    );
    requireThat(
      pro.name && pro.city && pro.services.length && pro.about.length >= 10,
      422,
      "INCOMPLETE_PROFILE",
      "Complete your business profile.",
    );
    const docs = await tx.document.findMany({
      where: { userId: actor(req).userId },
      select: { kind: true },
    });
    requireThat(
      docs.some((d) => d.kind === "IDENTITY") &&
        docs.some((d) => d.kind === "QUALIFICATION"),
      422,
      "MISSING_DOCUMENTS",
      "Upload identity and qualification evidence for review.",
    );
    const updated = await tx.professional.update({
      where: { id: pro.id },
      data: { status: "SUBMITTED", version: { increment: 1 } },
    });
    const admins = await tx.user.findMany({
      where: { role: "ADMIN", disabledAt: null },
      select: { id: true },
    });
    await announce(
      tx,
      admins.map((a) => a.id),
      "application",
      pro.id,
      "Professional application submitted",
    );
    await audit(tx, actor(req).userId, "PROFESSIONAL_SUBMITTED", pro.id);
    return updated;
  });
  res.json(result);
});
export const documentRoutes = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1 },
});
documentRoutes.get("/", async (req, res) =>
  res.json(
    await db.document.findMany({
      where: { userId: actor(req).userId },
      select: { id: true, kind: true, name: true, mime: true, reviewStatus: true, reviewNote: true, reviewedAt: true, createdAt: true },
    }),
  ),
);
documentRoutes.post(
  "/",
  roles("MECHANIC"),
  verified,
  upload.single("file"),
  async (req, res) => {
    const kind = z
        .enum(["IDENTITY", "QUALIFICATION", "BUSINESS"])
        .parse(req.body.kind),
      file = req.file;
    requireThat(file, 422, "FILE_REQUIRED", "Choose a document.");
    const pdf = file.buffer.subarray(0, 5).toString() === "%PDF-",
      png = file.buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      jpeg =
        file.buffer[0] === 255 &&
        file.buffer[1] === 216 &&
        file.buffer[2] === 255;
    requireThat(
      (pdf && file.mimetype === "application/pdf") ||
        (png && file.mimetype === "image/png") ||
        (jpeg && file.mimetype === "image/jpeg"),
      422,
      "INVALID_FILE",
      "Upload a PDF, JPEG or PNG document.",
    );
    const result = await transaction(async (tx) => {
      const pro = await tx.professional.findUniqueOrThrow({
        where: { userId: actor(req).userId },
      });
      requireThat(
        ["DRAFT", "CHANGES_REQUESTED"].includes(pro.status),
        409,
        "INVALID_STATE",
        "Reopen your profile before replacing application evidence.",
      );
      requireThat(
        (await tx.document.count({ where: { userId: actor(req).userId } })) <
          10,
        422,
        "UPLOAD_LIMIT",
        "Remove an old document first (maximum ten).",
      );
      return tx.document.create({
        data: {
          userId: actor(req).userId,
          kind,
          name:
            file.originalname.replace(/[^a-zA-Z0-9._ -]/g, "").slice(0, 160) ||
            "document",
          mime: file.mimetype,
          bytes: new Uint8Array(file.buffer),
        },
        select: { id: true, kind: true, name: true, reviewStatus: true, reviewNote: true, createdAt: true },
      });
    });
    res.status(201).json(result);
  },
);
// Private inline view: accessible only to the document owner or a verified administrator.
documentRoutes.get("/:id/preview", async (req, res) => {
  const doc = await db.document.findFirst({
    where: {
      id: id.parse(req.params.id),
      ...(actor(req).role === "ADMIN" ? {} : { userId: actor(req).userId }),
    },
  });
  requireThat(doc, 404, "NOT_FOUND", "Document not found.");
  requireThat(
    ["application/pdf", "image/png", "image/jpeg"].includes(doc.mime),
    415,
    "UNSUPPORTED_DOCUMENT",
    "This document cannot be previewed.",
  );
  res
    .set({
      "Content-Type": doc.mime,
      "Content-Disposition": 'inline',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    })
    .send(Buffer.from(doc.bytes));
});
documentRoutes.get("/:id", async (req, res) => {
  const doc = await db.document.findFirst({
    where: {
      id: id.parse(req.params.id),
      ...(actor(req).role === "ADMIN" ? {} : { userId: actor(req).userId }),
    },
  });
  requireThat(doc, 404, "NOT_FOUND", "Document not found.");
  res
    .set({
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${doc.name}"`,
      "Cache-Control": "no-store",
    })
    .send(Buffer.from(doc.bytes));
});
documentRoutes.delete("/:id", roles("MECHANIC"), async (req, res) => {
  await transaction(async (tx) => {
    const pro = await tx.professional.findUniqueOrThrow({
      where: { userId: actor(req).userId },
    });
    requireThat(
      ["DRAFT", "CHANGES_REQUESTED"].includes(pro.status),
      409,
      "INVALID_STATE",
      "Submitted evidence cannot be removed during review.",
    );
    const result = await tx.document.deleteMany({
      where: { id: id.parse(req.params.id), userId: actor(req).userId },
    });
    requireThat(result.count, 404, "NOT_FOUND", "Document not found.");
  });
  res.status(204).end();
});

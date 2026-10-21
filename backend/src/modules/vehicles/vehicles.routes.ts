import { Router } from "express";
import { z } from "zod";
import { db, transaction } from "../../lib/db.js";
import { actor, roles, verified } from "../../middleware/auth.js";
import { requireThat } from "../../lib/errors.js";
import { id, expectedVersion } from "../../lib/validation.js";
import { announce } from "../../lib/events.js";
const vehicleInput = z
  .object({
    make: z.string().trim().min(1).max(80),
    model: z.string().trim().min(1).max(100),
    year: z
      .number()
      .int()
      .min(1900)
      .max(new Date().getFullYear() + 1),
    variant: z.string().trim().max(100).default(""),
    registration: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .transform((s) => s.toUpperCase()),
    mileage: z.number().int().nonnegative().max(5000000).default(0),
    paintColorName: z.string().trim().max(80).default(""),
    paintColor: z
      .union([z.literal(""), z.string().regex(/^#[a-fA-F0-9]{6}$/)])
      .default(""),
    licenceDiscExpiry: z.iso.date().nullable().optional(),
    nextServiceDate: z.iso.date().nullable().optional(),
  })
  .strict();
const dates = (input: z.infer<typeof vehicleInput>) => ({
  ...input,
  licenceDiscExpiry: input.licenceDiscExpiry
    ? new Date(input.licenceDiscExpiry)
    : null,
  nextServiceDate: input.nextServiceDate
    ? new Date(input.nextServiceDate)
    : null,
});
export const vehicleRoutes = Router();
vehicleRoutes.use(roles("CUSTOMER"), verified);
vehicleRoutes.get("/", async (req, res) =>
  res.json(
    await db.vehicle.findMany({
      where: { customerId: actor(req).userId, archivedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ),
);
vehicleRoutes.post("/", async (req, res) => {
  const input = vehicleInput.parse(req.body),
    customerId = actor(req).userId;
  const vehicle = await transaction(async (tx) => {
    const v = await tx.vehicle.create({
      data: { ...dates(input), customerId },
    });
    await announce(tx, [customerId], "vehicle", v.id, "Vehicle added");
    return v;
  });
  res.status(201).json(vehicle);
});
vehicleRoutes.get("/:id", async (req, res) => {
  const vehicle = await db.vehicle.findFirst({
    where: { id: id.parse(req.params.id), customerId: actor(req).userId },
  });
  requireThat(vehicle, 404, "NOT_FOUND", "Vehicle not found.");
  const history = await db.serviceRecord.findMany({
    where: {
      booking: { vehicleId: vehicle.id, customerId: actor(req).userId },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const assets = await db.vehicleAsset.findMany({
    where: {
      make: { equals: vehicle.make, mode: "insensitive" },
      model: { equals: vehicle.model, mode: "insensitive" },
      variant: { equals: vehicle.variant, mode: "insensitive" },
      yearFrom: { lte: vehicle.year },
      yearTo: { gte: vehicle.year },
    },
    take: 2,
  });
  res.json({
    ...vehicle,
    history,
    modelAsset: assets.length === 1 ? assets[0] : null,
    modelMatch: assets.length === 1 ? "verified" : "unavailable",
  });
});
vehicleRoutes.patch("/:id", async (req, res) => {
  const { version, ...input } = vehicleInput
      .extend({ version: expectedVersion })
      .parse(req.body),
    vehicleId = id.parse(req.params.id);
  const result = await transaction(async (tx) => {
    const changed = await tx.vehicle.updateMany({
      where: {
        id: vehicleId,
        customerId: actor(req).userId,
        version,
        archivedAt: null,
      },
      data: { ...dates(input), version: { increment: 1 } },
    });
    requireThat(
      changed.count,
      409,
      "CONFLICT",
      "Vehicle unavailable or changed. Reload it.",
    );
    await announce(
      tx,
      [actor(req).userId],
      "vehicle",
      vehicleId,
      "Vehicle updated",
    );
    return tx.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
  });
  res.json(result);
});
vehicleRoutes.delete("/:id", async (req, res) => {
  const vehicleId = id.parse(req.params.id);
  await transaction(async (tx) => {
    const vehicle = await tx.vehicle.findFirst({
      where: { id: vehicleId, customerId: actor(req).userId },
    });
    requireThat(vehicle, 404, "NOT_FOUND", "Vehicle not found.");
    requireThat(
      !(await tx.booking.count({
        where: {
          vehicleId,
          status: { notIn: ["COMPLETED", "CANCELLED", "REJECTED"] },
        },
      })),
      409,
      "ACTIVE_BOOKING",
      "Finish or cancel active bookings before archiving this vehicle.",
    );
    await tx.vehicle.update({
      where: { id: vehicleId },
      data: { archivedAt: new Date(), version: { increment: 1 } },
    });
    await announce(
      tx,
      [actor(req).userId],
      "vehicle",
      vehicleId,
      "Vehicle archived",
    );
  });
  res.status(204).end();
});

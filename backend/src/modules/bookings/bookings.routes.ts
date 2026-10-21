import { Router } from "express";
import { z } from "zod";
import { db, transaction } from "../../lib/db.js";
import { actor, verified, roles } from "../../middleware/auth.js";
import { id, expectedVersion, takeQuery } from "../../lib/validation.js";
import { requireThat, ApiError } from "../../lib/errors.js";
import { announce } from "../../lib/events.js";
import { env } from "../../config/env.js";
import * as service from "./bookings.service.js";
export const bookingRoutes = Router();
bookingRoutes.use(verified);
bookingRoutes.get("/", async (req, res) => {
  const query = z
    .object({ take: takeQuery, cursor: id.optional() })
    .parse(req.query);
  const rows = await db.booking.findMany({
    where: service.scope(actor(req)),
    include: service.bookingInclude,
    orderBy: { id: "desc" },
    take: query.take,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  res.json(rows.map((row) => service.publicBooking(row, actor(req))));
});
bookingRoutes.post("/", roles("CUSTOMER"), async (req, res) =>
  res
    .status(201)
    .json(
      await service.createBooking(
        service.bookingInput.parse(req.body),
        actor(req),
      ),
    ),
);
bookingRoutes.get("/:id", async (req, res) =>
  res.json(
    service.publicBooking(
      await service.getBooking(db, id.parse(req.params.id), actor(req)),
      actor(req),
    ),
  ),
);
bookingRoutes.post("/:id/actions", async (req, res) =>
  res.json(
    service.publicBooking(
      await service.changeBooking(
        id.parse(req.params.id),
        service.actionInput.parse(req.body),
        actor(req),
      ),
      actor(req),
    ),
  ),
);
bookingRoutes.post("/:id/quotes", roles("MECHANIC"), async (req, res) =>
  res
    .status(201)
    .json(
      await service.createQuote(
        id.parse(req.params.id),
        service.quoteInput.parse(req.body),
        actor(req),
      ),
    ),
);
bookingRoutes.put(
  "/:id/quotes/:quoteId",
  roles("MECHANIC"),
  async (req, res) => {
    const { version, ...body } = z
      .object({ version: expectedVersion })
      .passthrough()
      .parse(req.body);
    res.json(
      await service.reviseQuote(
        id.parse(req.params.id),
        id.parse(req.params.quoteId),
        service.quoteInput.parse(body),
        version,
        actor(req),
      ),
    );
  },
);
bookingRoutes.post("/:id/quotes/:quoteId/actions", async (req, res) =>
  res.json(
    await service.changeQuote(
      id.parse(req.params.id),
      id.parse(req.params.quoteId),
      service.quoteActionInput.parse(req.body),
      actor(req),
    ),
  ),
);
bookingRoutes.get("/:id/quotes/:quoteId/invoice", async (req, res) => {
  const booking = await service.getBooking(
      db,
      id.parse(req.params.id),
      actor(req),
    ),
    quote = booking.quotes.find((q) => q.id === id.parse(req.params.quoteId));
  requireThat(
    quote?.payment,
    404,
    "NOT_FOUND",
    "No paid invoice is available.",
  );
  res.json({
    bookingId: booking.id,
    quoteNumber: quote.number,
    payment: quote.payment,
    lines: quote.lines.filter((l) => l.selected),
    issuer: booking.professional.name,
    customer: booking.customer.name,
    vehicle: booking.vehicle.registration,
    demo: quote.payment.provider === "TEST",
  });
});
bookingRoutes.post(
  "/:id/quotes/:quoteId/checkout",
  roles("CUSTOMER"),
  async (req, _res) => {
    const booking = await service.getBooking(
      db,
      id.parse(req.params.id),
      actor(req),
    );
    requireThat(
      booking.quotes.some((q) => q.id === id.parse(req.params.quoteId)),
      404,
      "NOT_FOUND",
      "Quotation not found.",
    );
    throw new ApiError(
      503,
      "PAYMENTS_NOT_CONFIGURED",
      "Online payments are not available yet. No payment has been taken.",
    );
  },
);
if (env.NODE_ENV !== "production" && env.ENABLE_TEST_PAYMENTS === "true")
  bookingRoutes.post(
    "/:id/quotes/:quoteId/test-payment",
    roles("CUSTOMER"),
    async (req, res) =>
      res.json(
        await service.recordTestPayment(
          id.parse(req.params.id),
          id.parse(req.params.quoteId),
          expectedVersion.parse(req.body.version),
          actor(req),
        ),
      ),
  );
bookingRoutes.get("/:id/messages", async (req, res) => {
  const booking = await service.getBooking(
    db,
    id.parse(req.params.id),
    actor(req),
  );
  const query = z
    .object({ take: takeQuery, cursor: id.optional() })
    .parse(req.query);
  res.json(
    await db.message.findMany({
      where: { bookingId: booking.id },
      select: {
        id: true,
        body: true,
        authorId: true,
        createdAt: true,
        author: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: query.take,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    }),
  );
});
bookingRoutes.post(
  "/:id/messages",
  roles("CUSTOMER", "MECHANIC"),
  async (req, res) => {
    const input = z
        .object({
          body: z.string().trim().min(1).max(4000),
          clientRequestId: id,
        })
        .strict()
        .parse(req.body),
      bookingId = id.parse(req.params.id);
    const message = await transaction(async (tx) => {
      const booking = await service.getBooking(tx, bookingId, actor(req));
      const prior = await tx.message.findUnique({
        where: {
          authorId_clientRequestId: {
            authorId: actor(req).userId,
            clientRequestId: input.clientRequestId,
          },
        },
      });
      if (prior) {
        requireThat(
          prior.bookingId === bookingId,
          409,
          "CONFLICT",
          "Request ID already used.",
        );
        return prior;
      }
      const result = await tx.message.create({
        data: { ...input, bookingId, authorId: actor(req).userId },
      });
      await announce(
        tx,
        [booking.customerId, booking.professional.userId].filter(
          (u) => u !== actor(req).userId,
        ),
        "message",
        bookingId,
        "New booking message",
      );
      return result;
    });
    res.status(201).json(message);
  },
);
bookingRoutes.put(
  "/:id/history-access",
  roles("CUSTOMER"),
  async (req, res) => {
    const input = z
        .object({ recordIds: z.array(id).max(100), grant: z.boolean() })
        .strict()
        .parse(req.body),
      bookingId = id.parse(req.params.id);
    await transaction(async (tx) => {
      const booking = await service.getBooking(tx, bookingId, actor(req));
      requireThat(
        ["CONFIRMED", "APPROVED", "IN_PROGRESS", "AWAITING_PAYMENT"].includes(
          booking.status,
        ),
        409,
        "INVALID_STATE",
        "History can only be shared during an accepted booking.",
      );
      const ids = [...new Set(input.recordIds)];
      const count = await tx.serviceRecord.count({
        where: {
          id: { in: ids },
          booking: {
            customerId: actor(req).userId,
            vehicleId: booking.vehicleId,
          },
        },
      });
      requireThat(
        count === ids.length,
        404,
        "NOT_FOUND",
        "Choose service records belonging to this vehicle.",
      );
      const data = {
        recordIds: ids,
        expiresAt: new Date(Date.now() + 30 * 86400000),
        revokedAt: input.grant ? null : new Date(),
      };
      await tx.historyGrant.upsert({
        where: { bookingId },
        create: { bookingId, ...data },
        update: data,
      });
      await announce(
        tx,
        [booking.professional.userId],
        "history-access",
        bookingId,
        input.grant
          ? "Vehicle history shared"
          : "Vehicle history access revoked",
      );
    });
    res.json({
      message: input.grant
        ? "Access granted for up to 30 days or until this booking ends."
        : "Access revoked.",
    });
  },
);
bookingRoutes.get("/:id/history", roles("MECHANIC"), async (req, res) => {
  const booking = await service.getBooking(
    db,
    id.parse(req.params.id),
    actor(req),
  );
  const grant = await db.historyGrant.findUnique({
    where: { bookingId: booking.id },
  });
  if (
    !grant ||
    grant.revokedAt ||
    grant.expiresAt < new Date() ||
    ["COMPLETED", "CANCELLED", "REJECTED"].includes(booking.status)
  ) {
    res.json([]);
    return;
  }
  res.json(
    await db.serviceRecord.findMany({
      where: {
        id: { in: grant.recordIds },
        booking: {
          vehicleId: booking.vehicleId,
          customerId: booking.customerId,
        },
      },
    }),
  );
});
bookingRoutes.put("/:id/review", roles("CUSTOMER"), async (req, res) => {
  const input = z
    .object({
      rating: z.number().int().min(1).max(5),
      body: z.string().trim().min(3).max(2000),
    })
    .strict()
    .parse(req.body);
  const result = await transaction(async (tx) => {
    const booking = await service.getBooking(
      tx,
      id.parse(req.params.id),
      actor(req),
    );
    requireThat(
      booking.status === "COMPLETED",
      409,
      "INVALID_STATE",
      "Reviews are available after completion.",
    );
    return tx.review.upsert({
      where: { bookingId: booking.id },
      create: {
        ...input,
        bookingId: booking.id,
        customerId: actor(req).userId,
        professionalId: booking.professionalId,
      },
      update: input,
    });
  });
  res.json(result);
});
bookingRoutes.delete("/:id/review", roles("CUSTOMER"), async (req, res) => {
  await service.getBooking(db, id.parse(req.params.id), actor(req));
  await db.review.deleteMany({
    where: {
      bookingId: id.parse(req.params.id),
      customerId: actor(req).userId,
    },
  });
  res.status(204).end();
});

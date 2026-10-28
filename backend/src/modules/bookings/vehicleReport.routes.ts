import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { db, transaction } from "../../lib/db.js";
import { actor, roles } from "../../middleware/auth.js";
import { announce, audit } from "../../lib/events.js";
import { requireThat } from "../../lib/errors.js";
import { id, expectedVersion } from "../../lib/validation.js";
import { getBooking } from "./bookings.service.js";

export const vehicleReportRoutes = Router();
const accepted = ["CONFIRMED", "APPROVED", "READY_TO_START", "IN_PROGRESS", "AWAITING_PAYMENT", "AWAITING_CONFIRMATION"];
const reportInput = z.object({
  version: expectedVersion,
  checkedLineIds: z.array(id).max(100).refine((list) => new Set(list).size === list.length, "Choose each repair once."),
  notes: z.string().trim().min(5).max(4000),
  mileage: z.number().int().min(0).max(5_000_000),
}).strict();

/** Do not accept a fabricated repair label or quote from the browser. */
vehicleReportRoutes.put("/:id/work-report", roles("MECHANIC"), async (req, res) => {
  const input = reportInput.parse(req.body);
  const bookingId = id.parse(req.params.id);
  const result = await transaction(async (tx) => {
    const booking = await getBooking(tx, bookingId, actor(req));
    requireThat(booking.status === "IN_PROGRESS", 409, "INVALID_STATE",
      "A work report can only be saved while this job is in progress.");
    requireThat(booking.version === input.version, 409, "CONFLICT",
      "This booking changed. Reload before editing the report.");
    const approved = booking.quotes
      .filter((quote) => quote.approvedAt !== null)
      .flatMap((quote) => quote.lines.filter((line) => line.selected).map((line) => ({
        id: line.id, quoteId: quote.id, quoteNumber: quote.number,
        description: line.description, category: line.category, quantity: line.quantity,
      })));
    const eligible = new Set(approved.map((line) => line.id));
    requireThat(approved.length > 0, 409, "NO_APPROVED_WORK", "An approved quotation is needed before recording work.");
    requireThat(input.checkedLineIds.every((lineId) => eligible.has(lineId)), 422,
      "INVALID_REPAIRS", "Only approved quotation items can be marked done.");
    const done = new Set(input.checkedLineIds);
    const now = new Date();
    const report = {
      items: approved.map((line) => ({ ...line, completed: done.has(line.id) })),
      notes: input.notes,
      mileage: input.mileage,
      updatedAt: now.toISOString(),
    };
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        workReport: report as Prisma.InputJsonValue,
        workReportUpdatedAt: now,
        version: { increment: 1 },
      },
    });
    await announce(tx, [booking.customerId], "booking", bookingId,
      "Workshop work report updated — review the details");
    await audit(tx, actor(req).userId, "WORK_REPORT_SAVED", bookingId,
      { checkedItems: input.checkedLineIds.length, totalItems: approved.length });
    return report;
  });
  res.json(result);
});

/** An opt-in request does not grant access by itself. */
vehicleReportRoutes.post("/:id/var-request", roles("MECHANIC"), async (req, res) => {
  const bookingId = id.parse(req.params.id);
  await transaction(async (tx) => {
    const booking = await getBooking(tx, bookingId, actor(req));
    requireThat(accepted.includes(booking.status), 409, "INVALID_STATE",
      "Request vehicle history during an accepted active booking.");
    const grant = await tx.historyGrant.findUnique({ where: { bookingId } });
    if (grant && !grant.revokedAt && grant.expiresAt > new Date() &&
        grant.recordIds.length > 0) return;
    if (grant?.requestedAt && !grant.grantedAt && !grant.revokedAt) return;
    const now = new Date();
    await tx.historyGrant.upsert({
      where: { bookingId },
      create: {
        bookingId, recordIds: [],
        expiresAt: new Date(now.getTime() + 30 * 86400000),
        requestedAt: now,
      },
      update: { requestedAt: now, grantedAt: null, revokedAt: null, recordIds: [] },
    });
    await announce(tx, [booking.customerId], "history-access", bookingId,
      "Workshop requested access to your Vehicle Activity Record (VAR)");
    await audit(tx, actor(req).userId, "VAR_ACCESS_REQUESTED", bookingId);
  });
  res.json({ message: "VAR request sent. Only the customer can approve access." });
});

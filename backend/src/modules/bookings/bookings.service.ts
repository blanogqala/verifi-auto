import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { transaction, type Tx } from "../../lib/db.js";
import { requireThat } from "../../lib/errors.js";
import { announce, audit } from "../../lib/events.js";
import { expectedVersion, id } from "../../lib/validation.js";
export type Actor = NonNullable<Express.Request["auth"]>;
export const bookingInclude = {
  vehicle: true,
  professional: {
    select: {
      id: true,
      userId: true,
      name: true,
      phone: true,
      city: true,
      type: true,
      user: { select: { email: true } },
    },
  },
  // Booking participants can see the customer's contact details for this appointment.
  // This relation is scope-protected by the booking query; do not expose it in the directory.
  customer: { select: { id: true, name: true, email: true, phone: true } },
  quotes: {
    include: { lines: true, payment: true },
    orderBy: { number: "asc" as const },
  },
  messages: {
    orderBy: { createdAt: "asc" as const },
    take: 100,
    include: { author: { select: { id: true, name: true, role: true } } },
  },
  grant: true,
  review: true,
  record: true,
} satisfies Prisma.BookingInclude;
export const scope = (actor: Actor): Prisma.BookingWhereInput =>
  actor.role === "ADMIN"
    ? {}
    : actor.role === "CUSTOMER"
      ? { customerId: actor.userId }
      : { professional: { userId: actor.userId } };
export async function getBooking(tx: Tx, bookingId: string, actor: Actor) {
  const booking = await tx.booking.findFirst({
    where: { id: bookingId, ...scope(actor) },
    include: bookingInclude,
  });
  requireThat(booking, 404, "NOT_FOUND", "Booking not found.");
  return booking;
}
export function publicBooking<T extends { quotes: { status: string }[] }>(
  booking: T,
  actor: Actor,
): T {
  return {
    ...booking,
    quotes:
      actor.role === "CUSTOMER"
        ? booking.quotes.filter((q) => q.status !== "DRAFT")
        : booking.quotes,
  };
}
const participants = (booking: Awaited<ReturnType<typeof getBooking>>) => [
  booking.customerId,
  booking.professional.userId,
];
const active = (status: string) =>
  !["COMPLETED", "REJECTED", "CANCELLED", "DISPUTED"].includes(status);
export const selectedTotal = (
  lines: { selected: boolean; quantity: number; unitPriceCents: number }[],
) =>
  lines
    .filter((l) => l.selected)
    .reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0);
export const bookingInput = z
  .object({
    vehicleId: id,
    professionalId: id,
    appointmentAt: z.iso.datetime({ offset: true }).optional(),
    description: z.string().trim().min(3).max(4000),
    kind: z.enum(["STANDARD", "EMERGENCY"]).default("STANDARD"),
    emergencyType: z.string().trim().max(100).default(""),
    roadsideAddress: z.string().trim().max(300).default(""),
    roadsideLatitude: z.number().min(-90).max(90).nullable().default(null),
    roadsideLongitude: z.number().min(-180).max(180).nullable().default(null),
    clientRequestId: id,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.kind === "STANDARD" && !value.appointmentAt) ctx.addIssue({ code: "custom", path: ["appointmentAt"], message: "Choose an appointment date." });
    if (value.kind === "EMERGENCY" && !value.emergencyType) ctx.addIssue({ code: "custom", path: ["emergencyType"], message: "Choose the breakdown type." });
    if (value.kind === "EMERGENCY" && value.roadsideAddress.length < 5) ctx.addIssue({ code: "custom", path: ["roadsideAddress"], message: "Describe where help is needed." });
    if ((value.roadsideLatitude === null) !== (value.roadsideLongitude === null)) ctx.addIssue({ code: "custom", path: ["roadsideLatitude"], message: "Provide both coordinates or neither." });
  });
export async function createBooking(
  input: z.infer<typeof bookingInput>,
  actor: Actor,
) {
  requireThat(
    actor.role === "CUSTOMER",
    403,
    "FORBIDDEN",
    "Only customers can book a service.",
  );
  return transaction(async (tx) => {
    const duplicate = await tx.booking.findUnique({
      where: {
        customerId_clientRequestId: {
          customerId: actor.userId,
          clientRequestId: input.clientRequestId,
        },
      },
      include: bookingInclude,
    });
    if (duplicate) return duplicate;
    if (input.kind === "STANDARD") requireThat(
      new Date(input.appointmentAt || "").getTime() > Date.now(),
      422,
      "INVALID_DATE",
      "Choose a future appointment.",
    );
    const vehicle = await tx.vehicle.findFirst({
      where: {
        id: input.vehicleId,
        customerId: actor.userId,
        archivedAt: null,
      },
    });
    requireThat(
      vehicle,
      404,
      "NOT_FOUND",
      "Choose one of your active vehicles.",
    );
    const pro = await tx.professional.findFirst({
      where: {
        id: input.professionalId,
        status: "APPROVED",
        user: { disabledAt: null },
        ...(input.kind === "EMERGENCY" ? { roadsideAvailable: true } : {}),
      },
    });
    requireThat(
      pro,
      404,
      "NOT_FOUND",
      "Professional is not available for bookings.",
    );
    const booking = await tx.booking.create({
      data: {
        ...input,
        customerId: actor.userId,
        appointmentAt: input.kind === "EMERGENCY" ? new Date() : new Date(input.appointmentAt!),
      },
      include: bookingInclude,
    });
    await announce(
      tx,
      participants(booking),
      "booking",
      booking.id,
      input.kind === "EMERGENCY" ? "URGENT roadside assistance request" : "New assessment request",
    );
    await audit(tx, actor.userId, "BOOKING_CREATED", booking.id);
    return booking;
  });
}
export const actionInput = z
  .object({
    action: z.enum(["accept", "reject", "cancel", "start", "complete", "confirm-work", "dispute-work", "resolve-accept", "resolve-rework"]),
    version: expectedVersion,
    reason: z.string().trim().max(2000).optional(),
    completionNotes: z.string().trim().max(4000).optional(),
  })
  .strict();
export async function changeBooking(
  bookingId: string,
  input: z.infer<typeof actionInput>,
  actor: Actor,
) {
  return transaction(async (tx) => {
    const booking = await getBooking(tx, bookingId, actor);
    requireThat(
      booking.version === input.version,
      409,
      "CONFLICT",
      "Booking changed. Reload before continuing.",
    );
    const customerAction = ["cancel", "confirm-work", "dispute-work"].includes(input.action);
    const adminAction = ["resolve-accept", "resolve-rework"].includes(input.action);
    requireThat(
      actor.role === (adminAction ? "ADMIN" : customerAction ? "CUSTOMER" : "MECHANIC"),
      403,
      "FORBIDDEN",
      "You cannot perform this action.",
    );
    let status = booking.status;
    if (input.action === "accept" || input.action === "reject") {
      requireThat(
        status === "REQUESTED",
        409,
        "INVALID_STATE",
        "Only pending appointments can be accepted or rejected.",
      );
      if (input.action === "reject")
        requireThat(
          input.reason && input.reason.length >= 3,
          422,
          "REASON_REQUIRED",
          "Provide a reason.",
        );
      if (input.action === "accept")
        requireThat(
          await tx.professional.count({
            where: { id: booking.professionalId, status: "APPROVED" },
          }),
          409,
          "PROFESSIONAL_UNAVAILABLE",
          "An active professional credential is required to accept new bookings.",
        );
      status = input.action === "accept" ? "CONFIRMED" : "REJECTED";
    } else if (input.action === "cancel") {
      requireThat(
        ["REQUESTED", "CONFIRMED"].includes(status) &&
          !booking.quotes.some((q) => q.approvedAt || q.payment),
        409,
        "INVALID_STATE",
        "This booking can no longer be cancelled here.",
      );
      status = "CANCELLED";
    } else if (input.action === "start") {
      requireThat(
        ["READY_TO_START", "APPROVED"].includes(status) &&
          booking.quotes.some((q) => q.approvedAt) &&
          booking.quotes.filter((q) => q.approvedAt).every((q) => q.payment),
        409,
        "PAYMENT_REQUIRED",
        "The customer must pay all approved quotations before repairs start.",
      );
      status = "IN_PROGRESS";
      await tx.quote.updateMany({
        where: { bookingId, approvedAt: { not: null } },
        data: { workStartedAt: new Date() },
      });
    } else if (input.action === "confirm-work") {
      requireThat(status === "AWAITING_CONFIRMATION", 409, "INVALID_STATE",
        "The workshop must submit completed work before the customer can confirm.");
      requireThat(booking.quotes.filter((q) => q.approvedAt).length > 0 &&
        booking.quotes.filter((q) => q.approvedAt).every((q) => q.payment),
        409, "PAYMENT_REQUIRED", "A verified payment is required before final confirmation.");
      status = "COMPLETED";
    } else if (input.action === "dispute-work") {
      requireThat(status === "AWAITING_CONFIRMATION", 409, "INVALID_STATE",
        "Disputes about finished work can be opened during customer confirmation.");
      requireThat(input.reason && input.reason.trim().length >= 10, 422, "REASON_REQUIRED",
        "Explain what was not completed (at least 10 characters).");
      status = "DISPUTED";
    } else if (input.action === "resolve-accept" || input.action === "resolve-rework") {
      requireThat(status === "DISPUTED" && booking.disputeStatus === "OPEN",
        409, "INVALID_STATE", "There is no open dispute for this booking.");
      requireThat(input.reason && input.reason.trim().length >= 10, 422, "REASON_REQUIRED",
        "Document your decision (at least 10 characters).");
      status = input.action === "resolve-accept" ? "COMPLETED" : "IN_PROGRESS";
    } else {
      requireThat(
        status === "IN_PROGRESS",
        409,
        "INVALID_STATE",
        "Start approved repairs first.",
      );
      requireThat(
        input.completionNotes && input.completionNotes.length >= 3,
        422,
        "NOTES_REQUIRED",
        "Describe the completed repairs.",
      );
      requireThat(
        !booking.quotes.some((q) =>
          ["SENT", "CHANGES_REQUESTED"].includes(q.status),
        ),
        409,
        "PENDING_QUOTES",
        "Resolve or withdraw pending quotations first.",
      );
      requireThat(booking.quotes.filter((q) => q.approvedAt).every((q) => q.payment),
        409, "PAYMENT_REQUIRED", "Payment must be recorded before work is finished.");
      status = "AWAITING_CONFIRMATION";
      await tx.quote.updateMany({
        where: { bookingId, approvedAt: { not: null } },
        data: { workStartedAt: new Date() },
      });
    }
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status,
        version: { increment: 1 },
        ...(input.action === "reject" ? { rejectionReason: input.reason } : {}),
        ...(input.action === "complete" ? { completionNotes: input.completionNotes } : {}),
        ...(input.action === "dispute-work" ? {
          disputeReason: input.reason!, disputeStatus: "OPEN",
          disputeResolution: "", disputeResolvedAt: null,
        } : {}),
        ...(adminAction ? {
          disputeStatus: input.action === "resolve-accept" ? "RESOLVED_ACCEPTED" : "RESOLVED_REWORK",
          disputeResolution: input.reason!, disputeResolvedAt: new Date(),
        } : {}),
      },
    });
    if (["CANCELLED", "REJECTED", "COMPLETED"].includes(status))
      await tx.historyGrant.updateMany({
        where: { bookingId },
        data: { revokedAt: new Date() },
      });
    if (status === "COMPLETED") await createServiceRecord(tx, bookingId);
    if (input.action === "dispute-work") {
      const admins = await tx.user.findMany({ where: { role: "ADMIN", disabledAt: null }, select: { id: true } });
      await announce(tx, admins.map((admin) => admin.id), "dispute", bookingId,
        "Customer disputed workshop completion — review required");
    }
    await announce(
      tx,
      participants(booking),
      "booking",
      bookingId,
      `Booking ${status.toLowerCase().replaceAll("_", " ")}`,
    );
    await audit(
      tx,
      actor.userId,
      `BOOKING_${input.action.toUpperCase()}`,
      bookingId,
    );
    return getBooking(tx, bookingId, actor);
  });
}
const lineInput = z
  .object({
    description: z.string().trim().min(1).max(300),
    category: z.enum(["assessment", "labour", "parts", "other"]),
    quantity: z.number().int().min(1).max(1000),
    unitPriceCents: z.number().int().min(1).max(100000000),
  })
  .strict();
export const quoteInput = z
  .object({
    notes: z.string().trim().min(3).max(4000),
    lines: z.array(lineInput).min(1).max(100),
    send: z.boolean(),
    clientRequestId: id,
  })
  .strict()
  .refine(
    (x) =>
      x.lines.reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0) <=
      2000000000,
    "Quotation total is too large.",
  );
export async function createQuote(
  bookingId: string,
  input: z.infer<typeof quoteInput>,
  actor: Actor,
) {
  requireThat(
    actor.role === "MECHANIC",
    403,
    "FORBIDDEN",
    "Only the assigned professional can quote.",
  );
  return transaction(async (tx) => {
    const booking = await getBooking(tx, bookingId, actor);
    requireThat(
      ["CONFIRMED", "APPROVED", "IN_PROGRESS"].includes(booking.status),
      409,
      "INVALID_STATE",
      "Accept the booking before quoting. Finished jobs cannot receive new quotes.",
    );
    const duplicate = booking.quotes.find(
      (q) => q.clientRequestId === input.clientRequestId,
    );
    if (duplicate) return duplicate;
    const quote = await tx.quote.create({
      data: {
        bookingId,
        number: booking.quotes.length + 1,
        notes: input.notes,
        status: input.send ? "SENT" : "DRAFT",
        sentAt: input.send ? new Date() : null,
        clientRequestId: input.clientRequestId,
        lines: { create: input.lines },
      },
      include: { lines: true, payment: true },
    });
    await tx.booking.update({
      where: { id: bookingId },
      data: { version: { increment: 1 } },
    });
    if (input.send)
      await announce(
        tx,
        [booking.customerId],
        "quotation",
        bookingId,
        `Quotation ${quote.number} ready for review`,
      );
    await audit(tx, actor.userId, "QUOTE_CREATED", quote.id, { bookingId });
    return quote;
  });
}
export const quoteActionInput = z
  .object({
    action: z.enum(["approve", "changes", "withdraw", "start"]),
    version: expectedVersion,
    selectedLineIds: z.array(id).min(1).max(100).optional(),
    request: z.string().trim().max(2000).default(""),
  })
  .strict();
export async function changeQuote(
  bookingId: string,
  quoteId: string,
  input: z.infer<typeof quoteActionInput>,
  actor: Actor,
) {
  return transaction(async (tx) => {
    const booking = await getBooking(tx, bookingId, actor),
      quote = booking.quotes.find((q) => q.id === quoteId);
    requireThat(
      quote && (actor.role !== "CUSTOMER" || quote.status !== "DRAFT"),
      404,
      "NOT_FOUND",
      "Quotation not found.",
    );
    requireThat(
      active(booking.status) && booking.status !== "AWAITING_PAYMENT",
      409,
      "JOB_FINISHED",
      "These repairs have already finished.",
    );
    requireThat(
      quote.version === input.version &&
        (!quote.payment || input.action === "start") && !quote.workStartedAt,
      409,
      "QUOTE_LOCKED",
      "Quotation changed, was paid, or repairs already started. Reload it.",
    );
    requireThat(
      actor.role ===
        (["approve", "changes"].includes(input.action)
          ? "CUSTOMER"
          : "MECHANIC"),
      403,
      "FORBIDDEN",
      "This quotation action is not available to you.",
    );
    let status = quote.status;
    if (input.action === "approve") {
      requireThat(
        ["SENT", "APPROVED"].includes(status),
        409,
        "INVALID_STATE",
        "This quotation is not ready for approval.",
      );
      requireThat(
        input.selectedLineIds?.length &&
          input.selectedLineIds.every((lineId) =>
            quote.lines.some((l) => l.id === lineId),
          ),
        422,
        "INVALID_SELECTION",
        "Select repairs from this quotation.",
      );
      await tx.quoteLine.updateMany({
        where: { quoteId },
        data: { selected: false },
      });
      await tx.quoteLine.updateMany({
        where: { quoteId, id: { in: input.selectedLineIds } },
        data: { selected: true },
      });
      status = "APPROVED";
      if (booking.status === "CONFIRMED")
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: "APPROVED" },
        });
    } else if (input.action === "changes") {
      requireThat(
        ["SENT", "APPROVED"].includes(status) && input.request.length >= 3,
        422,
        "INVALID_REQUEST",
        "Describe the changes you need.",
      );
      status = "CHANGES_REQUESTED";
    } else if (input.action === "withdraw") {
      requireThat(
        ["DRAFT", "SENT", "CHANGES_REQUESTED"].includes(status),
        409,
        "INVALID_STATE",
        "An approved quotation cannot be withdrawn.",
      );
      status = "WITHDRAWN";
    } else {
      requireThat(
        status === "PAID" && !!quote.payment && booking.status === "IN_PROGRESS",
        409,
        "PAYMENT_REQUIRED",
        "The customer must pay the additional quotation before these repairs begin.",
      );
      status = "IN_PROGRESS";
    }
    await snapshotQuote(tx, quote);
    await tx.quote.update({
      where: { id: quoteId },
      data: {
        status,
        version: { increment: 1 },
        customerRequest: input.request,
        approvedAt:
          input.action === "approve"
            ? new Date()
            : input.action === "changes"
              ? null
              : quote.approvedAt,
        ...(input.action === "start" ? { workStartedAt: new Date() } : {}),
      },
    });
    // Requesting changes to the last approved quote removes permission to start the overall job.
    if (
      input.action === "changes" &&
      booking.status === "APPROVED" &&
      !booking.quotes.some((q) => q.id !== quoteId && q.approvedAt)
    )
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED" },
      });
    await tx.booking.update({
      where: { id: bookingId },
      data: { version: { increment: 1 } },
    });
    await announce(
      tx,
      participants(booking),
      "quotation",
      bookingId,
      `Quotation ${quote.number}: ${status.toLowerCase().replaceAll("_", " ")}`,
    );
    await audit(
      tx,
      actor.userId,
      `QUOTE_${input.action.toUpperCase()}`,
      quoteId,
      { bookingId },
    );
    return tx.quote.findUniqueOrThrow({
      where: { id: quoteId },
      include: { lines: true, payment: true },
    });
  });
}
async function snapshotQuote(tx: Tx, quote: { id: string; version: number }) {
  await tx.quoteRevision.create({
    data: {
      quoteId: quote.id,
      version: quote.version,
      snapshot: JSON.parse(JSON.stringify(quote)) as Prisma.InputJsonValue,
    },
  });
}
export async function reviseQuote(
  bookingId: string,
  quoteId: string,
  input: z.infer<typeof quoteInput>,
  version: number,
  actor: Actor,
) {
  requireThat(
    actor.role === "MECHANIC",
    403,
    "FORBIDDEN",
    "Only the assigned professional can revise quotations.",
  );
  return transaction(async (tx) => {
    const booking = await getBooking(tx, bookingId, actor),
      quote = booking.quotes.find((q) => q.id === quoteId);
    requireThat(quote, 404, "NOT_FOUND", "Quotation not found.");
    requireThat(
      ["CONFIRMED", "APPROVED", "IN_PROGRESS"].includes(booking.status) &&
        !quote.payment &&
        !quote.workStartedAt &&
        ["DRAFT", "SENT", "CHANGES_REQUESTED"].includes(quote.status) &&
        quote.version === version,
      409,
      "QUOTE_LOCKED",
      "Request changes first, or create an additional quotation.",
    );
    requireThat(
      input.send || quote.status === "DRAFT",
      409,
      "INVALID_STATE",
      "A sent quotation must remain visible. Send the revision when ready.",
    );
    await snapshotQuote(tx, quote);
    await tx.quoteLine.deleteMany({ where: { quoteId } });
    const updated = await tx.quote.update({
      where: { id: quoteId },
      data: {
        notes: input.notes,
        lines: { create: input.lines },
        version: { increment: 1 },
        approvedAt: null,
        status: input.send ? "SENT" : "DRAFT",
        sentAt: input.send ? new Date() : null,
      },
      include: { lines: true, payment: true },
    });
    if (input.send)
      await announce(
        tx,
        [booking.customerId],
        "quotation",
        bookingId,
        `Quotation ${quote.number} revised; review the new prices`,
      );
    await tx.booking.update({
      where: { id: bookingId },
      data: { version: { increment: 1 } },
    });
    return updated;
  });
}
export async function createServiceRecord(tx: Tx, bookingId: string) {
  const booking = await tx.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: {
      quotes: {
        where: { approvedAt: { not: null } },
        include: { lines: { where: { selected: true } } },
      },
    },
  });
  // Snapshot the mechanic's actual checked work, not just the planned quote.
  // Pre-feature bookings retain their original approved-line fallback.
  const report = booking.workReport && typeof booking.workReport === "object" &&
    !Array.isArray(booking.workReport) ? booking.workReport as {
      items?: unknown; notes?: unknown; mileage?: unknown; updatedAt?: unknown
    } : null;
  const reportItems = Array.isArray(report?.items) ? report.items : null;
  const repairs = reportItems ?? booking.quotes.map((q) => ({
    quoteId: q.id, lines: q.lines,
  }));
  const notes = typeof report?.notes === "string" ? report.notes : booking.completionNotes;
  const mileage = typeof report?.mileage === "number" ? report.mileage : null;
  await tx.serviceRecord.upsert({
    where: { bookingId },
    update: { notes, mileage, repairs: JSON.parse(JSON.stringify(repairs)) as Prisma.InputJsonValue },
    create: {
      bookingId,
      notes,
      mileage,
      repairs: JSON.parse(JSON.stringify(repairs)) as Prisma.InputJsonValue,
    },
  });
}
/** Test-only recording uses server totals. Production payment confirmation must come from a verified PSP webhook. */
export async function recordTestPayment(
  bookingId: string,
  quoteId: string,
  version: number,
  actor: Actor,
) {
  requireThat(
    actor.role === "CUSTOMER",
    403,
    "FORBIDDEN",
    "Only the booking owner can pay.",
  );
  return transaction(async (tx) => {
    const booking = await getBooking(tx, bookingId, actor),
      quote = booking.quotes.find((q) => q.id === quoteId);
    requireThat(quote, 404, "NOT_FOUND", "Quotation not found.");
    if (quote.payment) return quote.payment;
    requireThat(
      active(booking.status) &&
        quote.version === version &&
        quote.approvedAt &&
        ["APPROVED", "IN_PROGRESS"].includes(quote.status),
      409,
      "APPROVAL_REQUIRED",
      "Review the current quotation before paying.",
    );
    const payment = await tx.payment.create({
      data: {
        quoteId,
        quoteVersion: quote.version,
        amountCents: selectedTotal(quote.lines),
        provider: "TEST",
        providerReference: `TEST-${quoteId}`,
      },
    });
    await tx.quote.update({
      where: { id: quoteId },
      data: { status: "PAID", version: { increment: 1 } },
    });
    if (
      ["APPROVED", "AWAITING_PAYMENT"].includes(booking.status) &&
      booking.quotes.filter((q) => q.approvedAt && q.id !== quoteId).every((q) => q.payment)
    ) {
      // Development-only payment is a test record. It never represents held escrow funds.
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "READY_TO_START", version: { increment: 1 } },
      });
    }
    await announce(
      tx,
      participants(booking),
      "payment",
      bookingId,
      `Test payment recorded for quotation ${quote.number}`,
    );
    await audit(tx, actor.userId, "TEST_PAYMENT", payment.id, {
      bookingId,
      quoteId,
      amountCents: payment.amountCents,
    });
    return payment;
  });
}

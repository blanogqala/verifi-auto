import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { randomUUID } from "node:crypto";
import { env } from "./config/env.js";
import { ApiError, errorHandler, requireThat } from "./lib/errors.js";
import { db } from "./lib/db.js";
import { authenticate, actor, roles, verified } from "./middleware/auth.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { vehicleRoutes } from "./modules/vehicles/vehicles.routes.js";
import {
  directoryRoutes,
  professionalRoutes,
  documentRoutes,
} from "./modules/professionals/professionals.routes.js";
import { bookingRoutes } from "./modules/bookings/bookings.routes.js";
import { notificationRoutes } from "./modules/notifications/notifications.routes.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import {
  scope,
  bookingInclude,
  publicBooking,
} from "./modules/bookings/bookings.service.js";
export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY_HOPS);
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-ID", req.requestId);
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(helmet());
app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token", "Last-Event-ID"],
  }),
);
app.use((req, _res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    requireThat(
      req.get("Origin") === env.WEB_ORIGIN,
      403,
      "ORIGIN_DENIED",
      "Request origin is not allowed.",
    );
    requireThat(
      req.is("application/json") || req.is("multipart/form-data"),
      415,
      "CONTENT_TYPE",
      "Use JSON or a supported upload.",
    );
  }
  next();
});
app.use(express.json({ limit: "128kb" }), cookieParser());
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/ready", async (_req, res) => {
  await db.$queryRaw`SELECT 1`;
  res.json({ status: "ready" });
});
app.use("/api", rateLimit("api", 300, 1));
app.use("/api/auth", authRoutes);
app.use("/api/professionals", directoryRoutes);
app.use("/api", authenticate);
app.use("/api", rateLimit("account", 240, 1));
app.get(
  "/api/customer/overview",
  roles("CUSTOMER"),
  verified,
  async (req, res) => {
    const customerId = actor(req).userId;
    const [
      activeBookings,
      quotesToReview,
      vehicles,
      serviceRecords,
      recentBookings,
    ] = await db.$transaction([
      db.booking.count({
        where: {
          customerId,
          status: { notIn: ["COMPLETED", "CANCELLED", "REJECTED"] },
        },
      }),
      db.quote.count({
        where: {
          booking: {
            customerId,
            status: { notIn: ["CANCELLED", "REJECTED", "COMPLETED"] },
          },
          status: "SENT",
        },
      }),
      db.vehicle.count({ where: { customerId, archivedAt: null } }),
      db.serviceRecord.count({ where: { booking: { customerId } } }),
      db.booking.findMany({
        where: { customerId },
        include: bookingInclude,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 2,
      }),
    ]);
    res.json({
      activeBookings,
      quotesToReview,
      vehicles,
      serviceRecords,
      recentBookings: recentBookings.map((row) =>
        publicBooking(row, actor(req)),
      ),
    });
  },
);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/professional", professionalRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.get("/api/payments", async (req, res) =>
  res.json(
    await db.payment.findMany({
      where: { quote: { booking: scope(actor(req)) } },
      include: { quote: { select: { number: true, bookingId: true } } },
      orderBy: { paidAt: "desc" },
      take: 100,
    }),
  ),
);
app.use((_req, _res) => {
  throw new ApiError(404, "NOT_FOUND", "Endpoint not found.");
});
app.use(errorHandler);

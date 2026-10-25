import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client.js";
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function requireThat(
  condition: unknown,
  status: number,
  code: string,
  message: string,
): asserts condition {
  if (!condition) throw new ApiError(status, code, message);
}
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (res.headersSent) {
    res.end();
    return;
  }
  let status = 500,
    code = "INTERNAL_ERROR",
    message = "Could not complete this request. Please try again.";
  let fields: unknown;
  if (error instanceof ApiError) ({ status, code, message } = error);
  else if (error instanceof ZodError) {
    status = 422;
    code = "VALIDATION_ERROR";
    message = "Please check the highlighted information.";
    fields = error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
  } else if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ["P2002", "P2025", "P2034"].includes(error.code)
  ) {
    status = 409;
    code = "CONFLICT";
    message =
      "This record already exists or changed. Refresh it and try again.";
  } else if (error?.type === "entity.parse.failed") {
    status = 400;
    code = "INVALID_JSON";
    message = "Invalid JSON request.";
  } else if (
    error?.code === "LIMIT_FILE_SIZE" ||
    error?.type === "entity.too.large"
  ) {
    status = 413;
    code = "TOO_LARGE";
    message = "The upload or request is too large.";
  }
  if (status === 500)
    console.error(
      JSON.stringify({
        requestId: req.requestId,
        error: error?.name || "Error",
        code: error?.code || "INTERNAL_ERROR",
        ...(process.env.NODE_ENV === "test"
          ? {
              route: req.originalUrl,
              detail: String(error?.message || "").slice(0, 350),
            }
          : {}),
      }),
    );
  res
    .status(status)
    .json({ error: { code, message, fields, requestId: req.requestId } });
};

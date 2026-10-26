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
  if (status === 500) {
    // Prisma validation failures after a schema update often mean that the local
    // generated client was not rebuilt. Keep request values out of server logs.
    const prismaValidation =
      error instanceof Prisma.PrismaClientValidationError;
    const schemaHint = prismaValidation
      ? String(error.message).split("\n").map((line) => line.trim())
          .find((line) => /^(Unknown field|Unknown argument|Argument .* is missing)/.test(line))
      : undefined;
    console.error(
      JSON.stringify({
        requestId: req.requestId,
        error: error?.name || "Error",
        code: error?.code || "INTERNAL_ERROR",
        ...(prismaValidation
          ? {
              hint: schemaHint || "Generated Prisma Client may not match the schema.",
              nextStep: "Stop the API, run npm run db:generate and npm run db:migrate in backend/, then restart.",
            }
          : error?.code === "P2022"
            ? { nextStep: "The database is missing a Prisma schema column. Run npm run db:migrate in backend/ and restart." }
            : {}),
      }),
    );
  }
  res
    .status(status)
    .json({ error: { code, message, fields, requestId: req.requestId } });
};

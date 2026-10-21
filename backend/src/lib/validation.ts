import { z } from "zod";
export const id = z.uuid();
export const email = z.email().trim().toLowerCase().max(254);
export const password = z
  .string()
  .min(8, "Use at least eight characters.")
  .max(128)
  .regex(/[0-9]/, "Include at least one number.");
export const phone = z
  .string()
  .trim()
  .max(25)
  .refine(
    (value) =>
      !value ||
      /^(?:0[6-8]\d{8}|\+27[6-8]\d{8})$/.test(value.replace(/[\s()-]/g, "")),
    "Enter a valid South African cellphone number.",
  );
export const expectedVersion = z.number().int().nonnegative();
export const takeQuery = z.coerce.number().int().min(1).max(100).default(30);

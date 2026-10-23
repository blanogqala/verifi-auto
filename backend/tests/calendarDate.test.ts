import assert from "node:assert/strict";
import { test } from "node:test";
import { calendarDate, dateOnly } from "../src/lib/calendarDate.js";

test("vehicle calendar dates stay on the recorded day", () => {
  assert.equal(calendarDate(null), null);
  assert.equal(calendarDate(""), null);
  assert.equal(calendarDate("2026-12-31"), "2026-12-31");
  assert.equal(calendarDate("2026-01-01T00:00:00.000Z"), "2026-01-01");
  assert.equal(calendarDate(new Date("2026-12-31T00:00:00.000Z")), "2026-12-31");
  assert.equal(dateOnly("2026-06-15")?.toISOString(), "2026-06-15T00:00:00.000Z");
  assert.equal(dateOnly(null), null);
});

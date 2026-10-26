import { test } from "node:test";
import assert from "node:assert/strict";
import { matchRoadsideProfessionals } from "../src/modules/professionals/roadsideMatching.js";

const origin = { latitude: -33.9, longitude: 18.5 };
const candidate = (id: string, latitude: number | null, longitude = 18.5) => ({ id, latitude, longitude: latitude == null ? null : longitude });

test("roadside results prefer a nearby provider and do not list every opted-in business", () => {
  const result = matchRoadsideProfessionals([candidate("far", -35.7), candidate("near", -33.93)], origin);
  assert.deepEqual(result.professionals.map((row) => row.id), ["near"]);
  assert.equal(result.radiusKm, 50);
});
test("search automatically expands to 100 km then to 200 km if needed", () => {
  const at80 = matchRoadsideProfessionals([candidate("eighty", -34.62)], origin);
  assert.equal(at80.radiusKm, 100);
  assert.equal(at80.professionals.length, 1);
  const at160 = matchRoadsideProfessionals([candidate("one-sixty", -35.34)], origin);
  assert.equal(at160.radiusKm, 200);
  assert.equal(at160.professionals.length, 1);
});
test("unlocated approved workshops are shown as unverified-distance fallback", () => {
  const result = matchRoadsideProfessionals([candidate("workshop", null)], origin);
  assert.equal(result.fallbackUnlocated, true);
  assert.equal(result.professionals[0].distanceKm, null);
  assert.equal(result.radiusKm, 200);
});
test("businesses more than 200 km away are excluded; unlocated businesses cannot be called nearby", () => {
  const result = matchRoadsideProfessionals([candidate("distant", -37)], origin);
  assert.equal(result.professionals.length, 0);
  assert.equal(result.fallbackUnlocated, false);
});
test("without customer location, show only a small unordered-by-distance shortlist", () => {
  const result = matchRoadsideProfessionals(Array.from({ length: 20 }, (_, i) => candidate(String(i).padStart(2,"0"), null)), null);
  assert.equal(result.professionals.length, 12);
  assert.equal(result.radiusKm, null);
  assert.equal(result.professionals[0].distanceKm, null);
});

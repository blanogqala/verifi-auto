import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { bookingInput } from '../src/modules/bookings/bookings.service.js';

const base = {
  vehicleId: randomUUID(),
  professionalId: randomUUID(),
  description: 'My car stopped by the highway exit.',
  clientRequestId: randomUUID(),
};

test('emergency booking permits an immediate unscheduled roadside request', () => {
  const input = bookingInput.parse({
    ...base,
    kind: 'EMERGENCY',
    emergencyType: 'Vehicle stopped while driving',
    roadsideAddress: 'N2 exit 16, eastbound next to the petrol station',
    roadsideLatitude: -33.9,
    roadsideLongitude: 18.5,
  });
  assert.equal(input.kind, 'EMERGENCY');
  assert.equal(input.appointmentAt, undefined);
  assert.equal(input.roadsideLatitude, -33.9);
});

test('regular bookings still require an appointment time', () => {
  assert.equal(bookingInput.safeParse(base).success, false);
  assert.equal(bookingInput.safeParse({
    ...base, appointmentAt: new Date(Date.now() + 3600000).toISOString(),
  }).success, true);
});

test('emergency bookings require the breakdown type and precise written location', () => {
  assert.equal(bookingInput.safeParse({
    ...base, kind: 'EMERGENCY', emergencyType: '',
    roadsideAddress: 'N2 exit 16',
  }).success, false);
  assert.equal(bookingInput.safeParse({
    ...base, kind: 'EMERGENCY', emergencyType: 'Tyre burst',
    roadsideAddress: 'N2',
  }).success, false);
});

test('roadside coordinates must be valid and paired', () => {
  const request = {
    ...base, kind: 'EMERGENCY', emergencyType: 'Tyre burst',
    roadsideAddress: 'N2 exit 16',
  };
  assert.equal(bookingInput.safeParse({ ...request, roadsideLatitude: 99, roadsideLongitude: 18 }).success, false);
  assert.equal(bookingInput.safeParse({ ...request, roadsideLatitude: -33.9 }).success, false);
  assert.equal(bookingInput.safeParse({ ...request }).success, true);
});

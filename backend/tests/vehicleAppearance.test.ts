import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectVerified3dAsset, vehicle3dPlan } from '../src/modules/vehicles/vehicleAppearance.js';

const asset = (variant: string, id: string) => ({
  id, variant, modelUrl: '/models/polo-reviewed.glb',
  licence: 'Licensed for app use',
  attribution: 'Licensed 3D contributor', sourceUrl: 'https://example.test/3d',
  verifiedAt: new Date('2026-10-01T00:00:00Z'),
});
test('reviewed and correctly matched trim is eligible for exact 3D', () => {
  assert.equal(
    selectVerified3dAsset({ variant: '1.0 TSI Life' }, [asset('1.0 tsi life', 'exact')])?.id,
    'exact',
  );
  assert.equal(selectVerified3dAsset({ variant: '' }, [asset('', 'generic')])?.id, 'generic');
});
test('unknown trims, unlicensed files and ambiguous assets cannot be called exact', () => {
  assert.equal(selectVerified3dAsset({ variant: 'GTI' }, [asset('', 'base')]), null);
  assert.equal(selectVerified3dAsset({ variant: 'GTI' }, [asset('Life', 'other')]), null);
  assert.equal(selectVerified3dAsset({ variant: '' }, [asset('GTI', 'gti')]), null);
  assert.equal(selectVerified3dAsset({ variant: '' }, [asset('', 'a'), asset('', 'b')]), null);
  assert.equal(selectVerified3dAsset({ variant: '' }, [
    { ...asset('', 'unsafe'), modelUrl: 'javascript:alert(1)' },
  ]), null);
  assert.equal(selectVerified3dAsset({ variant: '' }, [
    { ...asset('', 'uncleared'), licence: '' },
  ]), null);
});
test('backend provides a transparent rotatable preview plan without asserting OEM accuracy', () => {
  const id = { make: 'Volkswagen', model: 'Polo', year: 2022, variant: 'Life', bodyStyle: 'hatchback' };
  const preview = vehicle3dPlan(id, false);
  assert.deepEqual({ kind: preview.kind, bodyStyle: preview.bodyStyle },
    { kind: 'representative', bodyStyle: 'hatchback' });
  assert.match(preview.label, /not an exact manufacturer model/);
  assert.equal(vehicle3dPlan(id, true).kind, 'verified');
  assert.equal(vehicle3dPlan({ ...id, bodyStyle: 'invalid' }, false).bodyStyle, 'other');
});

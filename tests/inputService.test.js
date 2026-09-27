import test from 'node:test';
import assert from 'node:assert/strict';

import { validateShelterInput } from '../services/inputService.js';

const validPayload = {
  location: 'Validation location',
  lat: 22.7,
  lon: 75.8,
  dimensions: {
    length: 6,
    width: 4,
    height: 3
  },
  targetTemp: 22,
  materialCode: 'ROCKWOOL_S60',
  wallThickness_mm: 100,
  insulationThickness_mm: 120,
  occupants: 0,
  budgetINR: 0,
  costSurfaceType: 'walls'
};

test('valid production input passes engineering validation', () => {
  const result = validateShelterInput(validPayload);
  assert.deepEqual(result.errors, []);
  assert.equal(result.normalized.materialCode, 'ROCKWOOL_S60');
});

test('negative outdoor/target temperatures remain valid', () => {
  const result = validateShelterInput({
    ...validPayload,
    targetTemp: -5,
    lat: -20,
    lon: -45
  });
  assert.deepEqual(result.errors, []);
});

test('physically invalid geometry, location and thickness are rejected', () => {
  const result = validateShelterInput({
    ...validPayload,
    lat: 999,
    lon: -999,
    dimensions: {
      length: -1,
      width: 0,
      height: -2
    },
    wallThickness_mm: 0,
    insulationThickness_mm: -10,
    occupants: -3,
    budgetINR: -1
  });

  assert.ok(result.errors.some((message) => message.startsWith('lat ')));
  assert.ok(result.errors.some((message) => message.startsWith('lon ')));
  assert.ok(result.errors.some((message) => message.startsWith('dimensions.length ')));
  assert.ok(result.errors.some((message) => message.startsWith('dimensions.width ')));
  assert.ok(result.errors.some((message) => message.startsWith('dimensions.height ')));
  assert.ok(result.errors.some((message) => message.startsWith('wallThickness_mm ')));
  assert.ok(result.errors.some((message) => message.startsWith('insulationThickness_mm ')));
  assert.ok(result.errors.some((message) => message.startsWith('occupants ')));
  assert.ok(result.errors.some((message) => message.startsWith('budgetINR ')));
});

test('unknown cost surface type is rejected', () => {
  const result = validateShelterInput({
    ...validPayload,
    costSurfaceType: 'magic_surface'
  });
  assert.ok(result.errors.some((message) => message.startsWith('costSurfaceType ')));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { calculateConductionPhysics } from '../services/thermalPhysicsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const validationPath = path.join(
  __dirname,
  '..',
  'data',
  'validation',
  'ansys_conduction_cases.json'
);
const validation = JSON.parse(fs.readFileSync(validationPath, 'utf8'));

const percentError = (actualSignedW, ansysMagnitudeW) => {
  const actualMagnitude = Math.abs(actualSignedW);
  return Math.abs(actualMagnitude - ansysMagnitudeW) / ansysMagnitudeW * 100;
};

test('production conduction service reproduces all validated physics cases', () => {
  assert.ok(validation.validatedCaseCount > 0);

  for (const item of validation.cases) {
    const result = calculateConductionPhysics({
      dimensions: {
        length: item.lengthM,
        width: item.widthM,
        height: item.heightM
      },
      targetTempC: item.targetIndoorTempC,
      outsideTempC: item.outsideTempC,
      wallThicknessMm: item.wallThicknessMm,
      roofThicknessMm: item.roofThicknessMm,
      thermalConductivityWmK: item.thermalConductivityWmK
    });

    const expected = item.physicsTotalConductionW;
    const actual = result.thermal.totalConductionW;
    // Stored CSV physics labels are rounded to 6 decimals. The production
    // equation must reproduce them within that serialization precision.
    assert.ok(
      Math.abs(actual - expected) <= 0.000001,
      `${item.validationCase}: JS conduction result differs from stored validated physics result.`
    );

    const actualAnsError = percentError(
      actual,
      item.ansysTotalHeatTransferMagnitudeW
    );

    // The allowed engineering error is not invented here. We require the JS
    // implementation to be no worse than the already-recorded validation
    // error for the same ANSYS case, allowing only tiny floating-point slack.
    assert.ok(
      actualAnsError <= item.recordedTotalErrorPercent + 0.00001,
      `${item.validationCase}: ANSYS regression error increased.`
    );
  }
});

test('negative temperature difference is preserved as cooling direction', () => {
  const result = calculateConductionPhysics({
    dimensions: { length: 5, width: 4, height: 3 },
    targetTempC: 20,
    outsideTempC: 40,
    wallThicknessMm: 100,
    roofThicknessMm: 100,
    thermalConductivityWmK: 0.03
  });

  assert.ok(result.thermal.totalConductionW < 0);
  assert.equal(result.thermal.heatingLoadW, 0);
  assert.ok(result.thermal.coolingLoadW > 0);
});

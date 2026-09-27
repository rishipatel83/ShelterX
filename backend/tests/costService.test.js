import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateShelterAreas,
  calculateCostForQuote
} from '../services/costService.js';

test('shelter areas are calculated from user dimensions', () => {
  const areas = calculateShelterAreas({ length: 6, width: 4, height: 3 });
  assert.equal(areas.wallAreaM2, 60);
  assert.equal(areas.roofAreaM2, 24);
  assert.equal(areas.floorAreaM2, 24);
});

test('known material plus GST is not mislabeled as complete installed cost', () => {
  const result = calculateCostForQuote({
    quote: {
      priceId: 'P1',
      price: {
        amountINR: 100,
        unit: 'square_meter',
        currency: 'INR',
        gstPercent: 18,
        minimumOrderQty: null,
        minimumOrderUnit: null
      },
      product: {
        id: 'PR1',
        priceFamily: 'TEST',
        productName: 'Test product'
      },
      supplier: { id: 'S1', name: 'Test supplier' },
      source: null
    },
    dimensions: { length: 2, width: 2, height: 2 },
    surfaceType: 'roof',
    thicknessMm: 100,
    budgetINR: 1000
  });

  assert.equal(result.pricing.materialSubtotalINR, 400);
  assert.equal(result.pricing.gstINR, 72);
  assert.equal(result.pricing.knownMaterialPlusTaxTotalINR, 472);
  assert.equal(result.pricing.completeFinalCostKnown, false);
  assert.equal(result.budget.knownComponentsWithinBudget, true);
  assert.equal(result.budget.withinBudget, null);
});

test('known cost already above budget is safely marked over budget', () => {
  const result = calculateCostForQuote({
    quote: {
      priceId: 'P2',
      price: {
        amountINR: 1000,
        unit: 'square_meter',
        currency: 'INR',
        gstPercent: null,
        minimumOrderQty: null,
        minimumOrderUnit: null
      },
      product: {
        id: 'PR2',
        priceFamily: 'TEST',
        productName: 'Test product'
      },
      supplier: { id: 'S2', name: 'Test supplier' },
      source: null
    },
    dimensions: { length: 2, width: 2, height: 2 },
    surfaceType: 'roof',
    thicknessMm: 100,
    budgetINR: 1000
  });

  assert.equal(result.budget.withinBudget, false);
  assert.ok(result.budget.budgetRemainingINR < 0);
});

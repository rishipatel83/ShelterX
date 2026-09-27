import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectClimateZone,
  calculateDynamicMaterialRecommendations
} from '../services/materialRecommendationService.js';

test('climate zone detector maps geography and temperatures correctly', () => {
  // 1. Extreme Sub-Zero Glacial
  assert.equal(detectClimateZone({ location: 'Siachen Glacier', ambientTemp: -30 }), 'EXTREME_SUBZERO_GLACIAL');
  assert.equal(detectClimateZone({ location: 'Dras High Pass', ambientTemp: -22 }), 'EXTREME_SUBZERO_GLACIAL');

  // 2. High-Altitude Cold Arid
  assert.equal(detectClimateZone({ location: 'Ladakh High Altitude', ambientTemp: -12 }), 'HIGH_ALTITUDE_COLD_ARID');
  assert.equal(detectClimateZone({ location: 'Leh Plateau', ambientTemp: -5 }), 'HIGH_ALTITUDE_COLD_ARID');

  // 3. Hot & Arid Desert
  assert.equal(detectClimateZone({ location: 'Thar Desert (Jaisalmer)', ambientTemp: 38 }), 'HOT_ARID_DESERT');
  assert.equal(detectClimateZone({ location: 'Bikaner Dunes', ambientTemp: 32 }), 'HOT_ARID_DESERT');

  // 4. Cold & Humid Alpine
  assert.equal(detectClimateZone({ location: 'Tawang Monastic Valley', ambientTemp: 4 }), 'COLD_HUMID_ALPINE');

  // 5. Hot & Humid Coastal
  assert.equal(detectClimateZone({ location: 'Mumbai Coastal Region', ambientTemp: 28, lon: 72.87 }), 'HOT_HUMID_COASTAL');
});

test('calculateDynamicMaterialRecommendations returns distinct materials tailored to each location', () => {
  const glacialRecs = calculateDynamicMaterialRecommendations({
    location: 'Siachen Glacier',
    lat: 35.1866,
    lon: 77.1517,
    ambientNightTemp: -30,
    targetTemp: 20,
    dimensions: { length: 6, width: 5, height: 2.8 },
    wallThickness_mm: 180
  });

  const desertRecs = calculateDynamicMaterialRecommendations({
    location: 'Thar Desert',
    lat: 26.9157,
    lon: 70.9083,
    ambientNightTemp: 26,
    targetTemp: 22,
    dimensions: { length: 6, width: 5, height: 2.8 },
    wallThickness_mm: 180
  });

  // Glacial must recommend Cryo-VIP and Cryo-PUF
  assert.equal(glacialRecs.length, 3);
  assert.ok(glacialRecs[0].name.includes('Cryo-Vacuum'));
  assert.ok(glacialRecs[0].thermalConductivity <= 0.016);
  assert.equal(glacialRecs[0].simulationResults.climateZone, 'EXTREME_SUBZERO_GLACIAL');

  // Desert must recommend AAC or PCM for heat buffering
  assert.equal(desertRecs.length, 3);
  assert.ok(desertRecs[0].name.includes('Aerated Concrete') || desertRecs[0].name.includes('Phase Change'));
  assert.equal(desertRecs[0].simulationResults.climateZone, 'HOT_ARID_DESERT');

  // Material sets must NOT be identical
  assert.notEqual(glacialRecs[0].name, desertRecs[0].name);
});

import Material from '../models/material.js';
import { getMaterialsFromDB } from './nistService.js';

// Climate dictionary based on your UI locations
const climateProfiles = {
  "Siachen Glacier": -30,
  Ladakh: -15,
  "Dras/Kargil": -20,
  Leh: -12,
  Tawang: -5,
};

/**
 * Evaluate shelter with NIST materials and return ranked recommendations
 * @param {Object} params - Shelter parameters
 * @returns {Promise<Object>} Evaluation results with all materials ranked
 */
export const evaluateShelterWithNIST = async (params) => {
  const {
    location = "Leh",
    targetTempC = 20,
    length = 5,
    width = 4,
    height = 3,
    thicknessMM = 50,
    budgetINR = null,
  } = params;

  // Input validation
  if (!length || !width || !height || !thicknessMM) {
    throw new Error("Missing physical dimensions (length, width, height, thickness)");
  }

  // Get NIST materials from database or API
  const materials = await getMaterialsFromDB();
  if (!materials || materials.length === 0) {
    throw new Error("No materials available from NIST database");
  }

  // 1. Dynamic Geometry Calculations
  const thicknessM = thicknessMM / 1000;
  const wallArea = 2 * (length * height) + 2 * (width * height);
  const roofArea = length * width;
  const totalArea = wallArea + roofArea;
  const insulationVolume = totalArea * thicknessM;

  // 2. Get climate profile
  const outsideTemp = climateProfiles[location] || 15;
  const deltaT = Math.abs(targetTempC - outsideTemp);

  // 3. Evaluate Every Material Dynamically using NIST properties
  const evaluations = materials.map((mat) => {
    // Calculate mass of insulation material
    const materialMass = insulationVolume * (mat.density || 100); // kg

    // Cost calculation: costPerUnit represents cost per unit (can be per kg or per m³)
    // Adjusted calculation based on density
    const totalCost = materialMass * (mat.costPerUnit || 100) / 100;

    // Thermal calculations
    // Formula: q = (k / thickness) * DeltaT
    const kValue = mat.thermalConductivity || 0.05; // W/m·K, default for fiberglass
    const heatFlux = (kValue / thicknessM) * deltaT; // W/m²
    const totalHeatLossWatts = heatFlux * totalArea; // W

    // Determine budget status
    let status = "Affordable";
    if (budgetINR && totalCost > budgetINR) {
      status = "Exceeds Budget";
    }

    // Calculate efficiency score (lower heat loss + lower cost = higher score)
    const efficiencyScore = 1000 / (heatFlux + 1) * (10000 / (totalCost + 1));

    return {
      material: mat.name,
      source: "NIST Database",
      thermalConductivity: mat.thermalConductivity,
      density: mat.density,
      costPerUnit: mat.costPerUnit,
      materialMassKg: Math.round(materialMass),
      totalCostINR: Math.round(totalCost),
      heatFluxWm2: parseFloat(heatFlux.toFixed(2)),
      totalHeatLossWatts: Math.round(totalHeatLossWatts),
      status: status,
      efficiencyScore: Math.round(efficiencyScore * 100) / 100,
    };
  });

  // 4. Filter and Rank Results
  const affordableMaterials = evaluations.filter(
    (m) => m.status === "Affordable"
  );

  // Sort by efficiency (best overall performance)
  affordableMaterials.sort((a, b) => b.efficiencyScore - a.efficiencyScore);

  return {
    success: true,
    deployment_parameters: {
      location,
      outsideTemp,
      targetTempC,
      deltaT_Celsius: deltaT,
      calculatedVolumeM3: parseFloat(insulationVolume.toFixed(2)),
      totalSurfaceAreaM2: parseFloat(totalArea.toFixed(2)),
      insulationThicknessMM: thicknessMM,
    },
    shelter_dimensions: {
      length,
      width,
      height,
    },
    budget: budgetINR,
    optimalRecommendation:
      affordableMaterials.length > 0 ? affordableMaterials[0] : null,
    allResults: evaluations,
    affordableOptionsCount: affordableMaterials.length,
    summaryStats: {
      totalMaterialsEvaluated: evaluations.length,
      bestHeatFlux: Math.min(...evaluations.map((m) => m.heatFluxWm2)).toFixed(2),
      worstHeatFlux: Math.max(...evaluations.map((m) => m.heatFluxWm2)).toFixed(2),
      lowestCost: Math.min(...evaluations.map((m) => m.totalCostINR)),
      highestCost: Math.max(...evaluations.map((m) => m.totalCostINR)),
    },
  };
};

/**
 * Compare performance of two materials for a shelter
 */
export const compareMaterials = async (params) => {
  const {
    material1Name,
    material2Name,
    location = "Leh",
    targetTempC = 20,
    length = 5,
    width = 4,
    height = 3,
    thicknessMM = 50,
  } = params;

  const materials = await getMaterialsFromDB();
  const mat1 = materials.find((m) => m.name === material1Name);
  const mat2 = materials.find((m) => m.name === material2Name);

  if (!mat1 || !mat2) {
    throw new Error("One or both materials not found in database");
  }

  // Perform evaluation for both materials
  const eval1 = await evaluateShelterWithNIST({
    ...params,
  });

  const result1 = eval1.allResults.find((r) => r.material === material1Name);
  const result2 = eval1.allResults.find((r) => r.material === material2Name);

  return {
    success: true,
    comparison: {
      material1: {
        name: material1Name,
        ...result1,
      },
      material2: {
        name: material2Name,
        ...result2,
      },
      winner: {
        thermalPerformance:
          result1.heatFluxWm2 < result2.heatFluxWm2
            ? material1Name
            : material2Name,
        costEffectiveness:
          result1.totalCostINR < result2.totalCostINR
            ? material1Name
            : material2Name,
        overallEfficiency:
          result1.efficiencyScore > result2.efficiencyScore
            ? material1Name
            : material2Name,
      },
      differences: {
        heatFluxDifference: Math.abs(
          result1.heatFluxWm2 - result2.heatFluxWm2
        ).toFixed(2),
        costDifference: Math.abs(
          result1.totalCostINR - result2.totalCostINR
        ),
        efficiencyDifference: Math.abs(
          result1.efficiencyScore - result2.efficiencyScore
        ).toFixed(2),
      },
    },
  };
};

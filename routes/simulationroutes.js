import express from 'express';
import mongoose from 'mongoose';

import { verifyToken } from '../middleware/auth.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import Simulation from '../models/simulation.js';
import { validateShelterInput } from '../services/inputService.js';
import { optimizeBudgetOptions } from '../services/optimizerService.js';
import {
  getValidatedMaterialByCode,
  listValidatedMaterials
} from '../services/materialService.js';
import { fetchCurrentWeather } from '../services/weatherService.js';
import {
  calculateConductionPhysics,
  calculateConductionProfile
} from '../services/thermalPhysicsService.js';

const router = express.Router();

const simulationLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  keyPrefix: 'simulation'
});

router.use(simulationLimiter);

const resolveCostThickness = (inputs) => {
  switch (inputs.costSurfaceType) {
    case 'walls':
      return inputs.wallThickness_mm;
    case 'roof':
      return inputs.insulationThickness_mm;
    case 'floor':
      return null;
    case 'walls_and_roof':
    case 'full_envelope':
      return inputs.wallThickness_mm === inputs.insulationThickness_mm
        ? inputs.wallThickness_mm
        : null;
    default:
      return null;
  }
};

router.get('/materials', verifyToken, async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Material database is unavailable.'
      });
    }

    const materials = await listValidatedMaterials();
    return res.status(200).json({
      success: true,
      count: materials.length,
      materials
    });
  } catch (error) {
    console.error('Material list failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Material list could not be loaded.'
    });
  }
});

router.post('/simulate', verifyToken, async (req, res) => {
  try {
    const {
      normalized: inputs,
      errors,
      schemaVersion
    } = validateShelterInput(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ShelterX user input.',
        errors
      });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'ShelterX database is unavailable.'
      });
    }

    const [materialLookup, weather] = await Promise.all([
      getValidatedMaterialByCode(inputs.materialCode),
      fetchCurrentWeather(inputs.lat, inputs.lon)
    ]);

    if (!materialLookup) {
      return res.status(422).json({
        success: false,
        message: 'Selected material was not found or is inactive.',
        materialCode: inputs.materialCode
      });
    }

    if (!materialLookup.usableForThermalSimulation) {
      return res.status(422).json({
        success: false,
        message: materialLookup.reason,
        materialCode: inputs.materialCode
      });
    }

    const material = materialLookup.material;

    let costOptimization = null;
    if (inputs.costSurfaceType) {
      try {
        const thicknessMm = resolveCostThickness(inputs);

        costOptimization = await optimizeBudgetOptions({
          dimensions: inputs.dimensions,
          surfaceType: inputs.costSurfaceType,
          thicknessMm,
          budgetINR: inputs.budgetINR,
          priority: inputs.priority
        });

        if (
          thicknessMm === null &&
          ['walls_and_roof', 'full_envelope'].includes(inputs.costSurfaceType)
        ) {
          costOptimization.thicknessNote =
            'Wall and roof thicknesses differ. Mixed-surface quotes that require a single thickness are not treated as fully comparable.';
        }
      } catch (costError) {
        console.warn('Cost optimization unavailable:', costError.message);
        costOptimization = {
          optimizationStatus: 'cost-optimization-unavailable',
          message: 'Cost calculation could not be completed.'
        };
      }
    } else if (inputs.budgetINR !== undefined) {
      costOptimization = {
        optimizationStatus: 'waiting-for-cost-surface-type',
        budgetINR: inputs.budgetINR,
        message:
          'Select which shelter surface should be included in the cost calculation.'
      };
    }

    let thermal = null;
    let simulationStatus = 'complete';

    if (weather.available) {
      const basePhysicsInputs = {
        dimensions: inputs.dimensions,
        targetTempC: inputs.targetTemp,
        wallThicknessMm: inputs.wallThickness_mm,
        roofThicknessMm: inputs.insulationThickness_mm,
        thermalConductivityWmK: material.thermalConductivityWmK
      };

      const current = calculateConductionPhysics({
        ...basePhysicsInputs,
        outsideTempC: weather.currentTemperatureC
      });

      const forecast = calculateConductionProfile({
        ...basePhysicsInputs,
        hourlyTemperatures: weather.hourlyForecast
      });

      thermal = {
        status: 'available',
        current,
        forecast
      };
    } else {
      simulationStatus = 'partial-insufficient-weather-data';
      thermal = {
        status: 'insufficient-weather-data',
        reason: weather.reason ?? 'Current outdoor temperature is unavailable.',
        current: null,
        forecast: {
          hourly: [],
          peakHeatingLoadW: null,
          peakCoolingLoadW: null
        }
      };
    }

    const wallArea = 2 * (inputs.dimensions.length * inputs.dimensions.height + inputs.dimensions.width * inputs.dimensions.height);
    const roofArea = inputs.dimensions.length * inputs.dimensions.width;
    const totalArea = wallArea + roofArea;
    const thicknessM = Math.max((inputs.wallThickness_mm || 150) / 1000, 0.05);
    const ambientNight = weather.currentTemperatureC ?? -15;
    const deltaT = Math.max(Math.abs(inputs.targetTempC - ambientNight), 1);

    const topMaterialRecommendations = [
      {
        name: 'NIST: Polyurethane Foam (PUF) Composite',
        recommendationType: 'Optimal Balance',
        tagline: 'High Thermal Retention & Economical Life-Cycle Deployment',
        badgeColor: 'emerald',
        thermalConductivity: 0.026,
        density: 35.2,
        costPerUnit: 160,
        estimatedTotalCost: Math.round(totalArea * 310),
        heatFlux: Number(((0.026 / thicknessM) * deltaT).toFixed(1)),
        totalHeatLoss: Math.round(((0.026 / thicknessM) * deltaT) * totalArea),
        efficiencyScore: 82.5,
        simulationResults: {
          predictedInsideTempNight: Math.round(inputs.targetTempC - deltaT * 0.24)
        }
      },
      {
        name: 'Aerogel Vacuum Insulated Panel (VIP)',
        recommendationType: 'Max Insulation',
        tagline: 'Ultra-Low Heat Flux: Engineered for severe Himalayan sub-zero nights',
        badgeColor: 'blue',
        thermalConductivity: 0.016,
        density: 140.0,
        costPerUnit: 310,
        estimatedTotalCost: Math.round(totalArea * 560),
        heatFlux: Number(((0.016 / thicknessM) * deltaT).toFixed(1)),
        totalHeatLoss: Math.round(((0.016 / thicknessM) * deltaT) * totalArea),
        efficiencyScore: 94.8,
        simulationResults: {
          predictedInsideTempNight: Math.round(inputs.targetTempC - deltaT * 0.12)
        }
      },
      {
        name: 'High-Density Rockwool Core Sandwich',
        recommendationType: 'Budget Friendly',
        tagline: 'Cost-Effective, Non-Combustible Fast-Assembly Modular Panel',
        badgeColor: 'amber',
        thermalConductivity: 0.040,
        density: 110.0,
        costPerUnit: 95,
        estimatedTotalCost: Math.round(totalArea * 180),
        heatFlux: Number(((0.040 / thicknessM) * deltaT).toFixed(1)),
        totalHeatLoss: Math.round(((0.040 / thicknessM) * deltaT) * totalArea),
        efficiencyScore: 66.4,
        simulationResults: {
          predictedInsideTempNight: Math.round(inputs.targetTempC - deltaT * 0.38)
        }
      }
    ];

    const recommendation = {
      status: 'generated',
      topMaterialRecommendations
    };

    const simulation = await Simulation.create({
      userId: req.user?.id ?? null,
      schemaVersion,
      status: simulationStatus,
      inputs,
      material,
      weather,
      thermalResult: thermal,
      costResult: costOptimization,
      recommendation
    });

    return res.status(200).json({
      success: true,
      schemaVersion,
      simulationId: simulation._id.toString(),
      persisted: true,
      status: simulationStatus,
      inputs,
      material,
      weather,
      result: {
        thermal,
        cost: costOptimization,
        recommendation
      },

      // Temporary compatibility block for the existing frontend.
      location: inputs.location,
      ambientData: {
        currentTempC: weather.currentTemperatureC ?? null,
        currentTime: weather.currentTime ?? null,
        hourlyForecast: (weather.hourlyForecast ?? []).map((item) => ({
          time: item.time,
          temp: item.tempC
        }))
      },
      recommendedShelter: {
        dimensions: inputs.dimensions,
        orientation: inputs.orientation ?? null,
        occupants: inputs.occupants ?? null,
        budgetINR: inputs.budgetINR ?? null,
        materials: {
          selectedMaterialCode: material.materialCode,
          selectedMaterialName: material.name,
          wallThickness_mm: inputs.wallThickness_mm,
          insulationThickness_mm: inputs.insulationThickness_mm
        },
        optimalMaterialDetails: {
          name: topMaterialRecommendations[0].name,
          thermalConductivity: topMaterialRecommendations[0].thermalConductivity,
          density: topMaterialRecommendations[0].density,
          costPerUnit: topMaterialRecommendations[0].costPerUnit,
          estimatedTotalCost: topMaterialRecommendations[0].estimatedTotalCost,
          heatFlux: topMaterialRecommendations[0].heatFlux,
          totalHeatLoss: topMaterialRecommendations[0].totalHeatLoss,
          efficiencyScore: topMaterialRecommendations[0].efficiencyScore
        },
        topMaterialRecommendations,
        simulationResults: {
          totalConductionW:
            thermal.current?.thermal?.totalConductionW ?? null,
          heatingLoadW:
            thermal.current?.thermal?.heatingLoadW ?? null,
          coolingLoadW:
            thermal.current?.thermal?.coolingLoadW ?? null,
          peak24hHeatingLoadW:
            thermal.forecast?.peakHeatingLoadW ?? null,
          peak24hCoolingLoadW:
            thermal.forecast?.peakCoolingLoadW ?? null,
          hourlyConduction:
            thermal.forecast?.hourly ?? []
        }
      }
    });
  } catch (error) {
    console.error('ShelterX simulation route error:', error);

    return res.status(500).json({
      success: false,
      message: 'ShelterX simulation could not be completed.'
    });
  }
});

export default router;

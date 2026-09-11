import express from 'express';
import axios from 'axios';
import { verifyToken } from '../middleware/auth.js';
import Material from '../models/material.js';
import Simulation from '../models/simulation.js';
import { evaluateShelterWithNIST, compareMaterials } from '../services/ansysService.js';

const router = express.Router();

/**
 * POST /api/v1/sih/simulate
 * Run shelter simulation with real-time weather data and NIST materials
 */
router.post('/simulate', verifyToken, async (req, res) => {
    try {
        const { 
            location = 'Leh',
            lat, 
            lon, 
            dimensions = { width: 5, length: 6, height: 3 }, 
            targetTemp = 20, 
            orientation = 'South-Facing',
            roofMaterial = 'PUF Insulated Panels', 
            wallThickness_mm = 50
        } = req.body;

        const userId = req.user.id;
        const latitude = lat ?? 34.1526; 
        const longitude = lon ?? 77.5771;

        // Fetch real-time weather data
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,wind_speed_10m,direct_normal_irradiance&forecast_days=1`;
        const weatherResponse = await axios.get(weatherUrl);

        const hourlyTemps = weatherResponse.data.hourly.temperature_2m || [];
        const hourlyWinds = weatherResponse.data.hourly.wind_speed_10m || [];
        const hourlyIrradiance = weatherResponse.data.hourly.direct_normal_irradiance || [];

        // Process hourly forecast
        const hourlyForecast = hourlyTemps.slice(0, 24).map((temp, index) => ({
            hour: index,
            temp: Math.round(temp),
            wind: Math.round(hourlyWinds[index] ?? 12)
        }));

        // Calculate day/night averages
        const dayTemps = hourlyTemps.filter((_, hr) => hr >= 6 && hr <= 18);
        const nightTemps = hourlyTemps.filter((_, hr) => hr < 6 || hr > 18);

        const avgTempDay = dayTemps.length 
            ? Math.round(dayTemps.reduce((a, b) => a + b, 0) / dayTemps.length) 
            : Math.round(hourlyTemps[12] ?? 5);

        const avgTempNight = nightTemps.length 
            ? Math.round(nightTemps.reduce((a, b) => a + b, 0) / nightTemps.length) 
            : Math.round(hourlyTemps[0] ?? -15);

        const maxIrradiance = hourlyIrradiance.length ? Math.max(...hourlyIrradiance) : 0;
        const solarIrradiance = maxIrradiance > 0 ? Math.round(maxIrradiance) : 2100;

        // Evaluate all NIST materials for this shelter
        const nistEvaluation = await evaluateShelterWithNIST({
            location,
            targetTempC: targetTemp,
            length: dimensions.length || 6,
            width: dimensions.width || 5,
            height: dimensions.height || 3,
            thicknessMM: wallThickness_mm,
            budgetINR: null
        });

        if (!nistEvaluation.optimalRecommendation) {
            return res.status(500).json({ 
                success: false,
                message: "Unable to find suitable materials from NIST database"
            });
        }

        const optimalMaterial = nistEvaluation.optimalRecommendation;

        // Calculate predicted inside temperature based on ANSYS thermal model
        const thermalResistance = (dimensions.length * dimensions.width) * 
                                 (1 / (optimalMaterial.thermalConductivity || 0.05));
        
        const hourlyInsideTemp = hourlyTemps.slice(0, 24).map((ambientTemp) => {
            const deltaT = (targetTemp - ambientTemp) * Math.exp(-0.001 * thermalResistance);
            const inside = targetTemp - deltaT * 0.4;
            return Math.round(inside);
        });

        // Calculate night-time predicted temperature
        const nightInsideTemps = hourlyInsideTemp.filter((_, hr) => hr < 6 || hr > 18);
        const predictedInsideTempNight = nightInsideTemps.length 
            ? Math.round(nightInsideTemps.reduce((a, b) => a + b, 0) / nightInsideTemps.length)
            : 18;

        // Determine heat loss rate category
        let heatLossRate = 'High';
        if (optimalMaterial.thermalConductivity <= 0.03) {
            heatLossRate = 'Low';
        } else if (optimalMaterial.thermalConductivity <= 0.1) {
            heatLossRate = 'Moderate';
        }

        // Save simulation to database
        const newSimulation = new Simulation({
            userId,
            dimensions,
            materialUsed: optimalMaterial.material,
            coordinates: { lat: latitude, lon: longitude },
            interiorTemperatureResult: predictedInsideTempNight,
            costEvaluation: optimalMaterial.totalCostINR
        });
        await newSimulation.save();

        // Return comprehensive simulation results
        res.status(200).json({
            success: true,
            simulationId: newSimulation._id,
            location: location || "Leh",
            ambientData: {
                avgTempDay,
                avgTempNight,
                solarIrradiance,
                hourlyForecast
            },
            nistDatabase: {
                totalMaterialsEvaluated: nistEvaluation.totalMaterialsEvaluated,
                affordableOptions: nistEvaluation.affordableOptionsCount,
                summary: nistEvaluation.summaryStats
            },
            recommendedShelter: {
                dimensions: {
                    width: dimensions.width || 5,
                    length: dimensions.length || 6,
                    height: dimensions.height || 3
                },
                orientation: orientation || "South-Facing",
                materials: {
                    walls: optimalMaterial.material,
                    roof: roofMaterial || "PUF Insulated Panels",
                    wallThickness_mm: wallThickness_mm || 50
                },
                optimalMaterialDetails: {
                    name: optimalMaterial.material,
                    thermalConductivity: optimalMaterial.thermalConductivity,
                    density: optimalMaterial.density,
                    costPerUnit: optimalMaterial.costPerUnit,
                    estimatedTotalCost: optimalMaterial.totalCostINR,
                    heatFlux: optimalMaterial.heatFluxWm2,
                    totalHeatLoss: optimalMaterial.totalHeatLossWatts,
                    efficiencyScore: optimalMaterial.efficiencyScore
                },
                simulationResults: {
                    predictedInsideTempNight,
                    predictedInsideTempDay: hourlyInsideTemp[12] || targetTemp,
                    heatLossRate,
                    hourlyInsideTemp
                }
            }
        });

    } catch (err) {
        console.error('Simulation error:', err);
        res.status(500).json({ 
            success: false, 
            error: err.message,
            details: 'Failed to run shelter simulation with NIST materials'
        });
    }
});

/**
 * POST /api/v1/sih/evaluate-shelter
 * Quick evaluation of shelter without weather data
 */
router.post('/evaluate-shelter', async (req, res) => {
    try {
        const {
            location = 'Leh',
            dimensions = { length: 5, width: 4, height: 3 },
            targetTemp = 20,
            wallThickness_mm = 50,
            budget = null
        } = req.body;

        const evaluation = await evaluateShelterWithNIST({
            location,
            targetTempC: targetTemp,
            length: dimensions.length,
            width: dimensions.width,
            height: dimensions.height,
            thicknessMM: wallThickness_mm,
            budgetINR: budget
        });

        res.status(200).json(evaluation);
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

/**
 * POST /api/v1/sih/compare-materials
 * Compare two materials for a shelter configuration
 */
router.post('/compare-materials', async (req, res) => {
    try {
        const {
            material1Name,
            material2Name,
            location = 'Leh',
            dimensions = { length: 5, width: 4, height: 3 },
            targetTemp = 20,
            wallThickness_mm = 50
        } = req.body;

        if (!material1Name || !material2Name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Both material1Name and material2Name are required' 
            });
        }

        const comparison = await compareMaterials({
            material1Name,
            material2Name,
            location,
            targetTempC: targetTemp,
            length: dimensions.length,
            width: dimensions.width,
            height: dimensions.height,
            thicknessMM: wallThickness_mm
        });

        res.status(200).json(comparison);
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

/**
 * GET /api/v1/sih/history/:userId
 * Get user's simulation history
 */
router.get('/history/:userId', verifyToken, async (req, res) => {
    try {
        const simulations = await Simulation.find({ userId: req.params.userId })
            .sort({ createdAt: -1 })
            .limit(10);

        res.status(200).json({
            success: true,
            count: simulations.length,
            data: simulations
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

export default router;
import express from 'express';
import Material from '../models/material.js';
import { fetchNistMaterials, getMaterialsFromDB, recommendMaterials } from '../services/nistService.js';

const router = express.Router();

/**
 * GET /api/v1/nist/materials
 * Fetch all available materials from NIST dataset
 */
router.get('/materials', async (req, res) => {
    try {
        const materials = await getMaterialsFromDB();
        res.status(200).json({
            success: true,
            count: materials.length,
            data: materials
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: `Failed to fetch materials: ${err.message}`
        });
    }
});

/**
 * POST /api/v1/nist/import
 * Import NIST materials into MongoDB database
 */
router.post('/import', async (req, res) => {
    try {
        const nistMaterials = await fetchNistMaterials();

        if (!nistMaterials || !nistMaterials.length) {
            return res.status(400).json({
                success: false,
                message: "No NIST materials available to import."
            });
        }

        let insertedCount = 0;
        let updatedCount = 0;

        for (const mat of nistMaterials) {
            const result = await Material.updateOne(
                { name: mat.name },
                { $set: mat },
                { upsert: true }
            );

            if (result.upsertedCount > 0) {
                insertedCount++;
            } else if (result.modifiedCount > 0) {
                updatedCount++;
            }
        }

        res.status(200).json({
            success: true,
            message: "NIST materials imported successfully into MongoDB database.",
            summary: {
                totalProcessed: nistMaterials.length,
                inserted: insertedCount,
                updated: updatedCount
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: `NIST database import failed: ${err.message}`
        });
    }
});

/**
 * POST /api/v1/nist/recommend
 * Get material recommendations based on shelter parameters
 * 
 * Request body:
 * {
 *   "dimensions": { "length": 5, "width": 4, "height": 3 },
 *   "targetTemp": 20,
 *   "budget": 50000,
 *   "location": "Leh",
 *   "topN": 5
 * }
 */
router.post('/recommend', async (req, res) => {
    try {
        const {
            dimensions = { length: 5, width: 4, height: 3 },
            targetTemp = 20,
            budget = null,
            location = 'moderate',
            topN = 5
        } = req.body;

        // Validate input
        if (!dimensions || !dimensions.length || !dimensions.width || !dimensions.height) {
            return res.status(400).json({
                success: false,
                error: 'Missing or invalid shelter dimensions (length, width, height in meters)'
            });
        }

        if (targetTemp < -50 || targetTemp > 50) {
            return res.status(400).json({
                success: false,
                error: 'Target temperature must be between -50°C and 50°C'
            });
        }

        // Get recommendations
        const recommendations = await recommendMaterials({
            dimensions,
            targetTemp,
            budget,
            location,
            topN: Math.min(topN, 20) // Cap at 20 recommendations
        });

        res.status(200).json(recommendations);
    } catch (err) {
        console.error('Recommendation error:', err);
        res.status(500).json({
            success: false,
            error: `Failed to generate material recommendations: ${err.message}`
        });
    }
});

/**
 * POST /api/v1/nist/evaluate
 * Evaluate shelter performance with a specific material
 * 
 * Request body:
 * {
 *   "materialName": "NIST: Glass Fiber",
 *   "dimensions": { "length": 5, "width": 4, "height": 3 },
 *   "targetTemp": 20,
 *   "location": "Leh",
 *   "insulationThickness": 50
 * }
 */
router.post('/evaluate', async (req, res) => {
    try {
        const {
            materialName,
            dimensions = { length: 5, width: 4, height: 3 },
            targetTemp = 20,
            location = 'moderate',
            insulationThickness = 50
        } = req.body;

        if (!materialName) {
            return res.status(400).json({
                success: false,
                error: 'Material name is required'
            });
        }

        // Get the material
        const material = await Material.findOne({ name: materialName });
        if (!material) {
            return res.status(404).json({
                success: false,
                error: `Material "${materialName}" not found in database`
            });
        }

        // Climate profiles
        const climateProfiles = {
            'Siachen Glacier': -30,
            'Ladakh': -15,
            'Dras/Kargil': -20,
            'Leh': -12,
            'Tawang': -5,
            'moderate': 15
        };

        const outsideTemp = climateProfiles[location] || 15;
        const deltaT = Math.abs(targetTemp - outsideTemp);

        // Calculate shelter metrics
        const thicknessM = insulationThickness / 1000;
        const wallArea = 2 * (dimensions.length * dimensions.height) + 2 * (dimensions.width * dimensions.height);
        const roofArea = dimensions.length * dimensions.width;
        const totalArea = wallArea + roofArea;
        const insulationVolume = totalArea * thicknessM;

        // Thermal calculations
        const heatFlux = (material.thermalConductivity / thicknessM) * deltaT;
        const totalHeatLoss = heatFlux * totalArea;
        const materialCost = insulationVolume * material.density * (material.costPerUnit || 100) / 1000;

        res.status(200).json({
            success: true,
            material: {
                name: material.name,
                thermalConductivity: material.thermalConductivity,
                density: material.density,
                costPerUnit: material.costPerUnit,
                specificHeat: material.specificHeat
            },
            shelter: {
                dimensions,
                targetTemp,
                location,
                outsideTemp,
                deltaT,
                insulationThickness
            },
            performance: {
                heatFluxWm2: Math.round(heatFlux * 100) / 100,
                totalHeatLossWatts: Math.round(totalHeatLoss),
                insulationVolumeM3: Math.round(insulationVolume * 100) / 100,
                estimatedCostINR: Math.round(materialCost),
                efficiency: 'Good' // Can be improved with more advanced calculation
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: `Evaluation failed: ${err.message}`
        });
    }
});

export default router;

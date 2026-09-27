import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Material from '../models/material.js';
import { listValidatedMaterials } from '../services/materialService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const materialsJsonPath = path.join(__dirname, '..', 'data', 'materials.json');
const materialsCsvPath = path.join(__dirname, '..', 'data', 'materials', 'materials.csv');

// Fallback materials if neither database nor JSON has data
const FALLBACK_MATERIALS = [
  {
    name: 'PUF Insulated Panels',
    thermalConductivity: 0.024,
    density: 40,
    specificHeat: 1400,
    costPerUnit: 140,
    category: 'Insulation',
    description: 'High-efficiency polyurethane foam sandwich panels for cold regions'
  },
  {
    name: 'Composite Phase Change Material (PCM)',
    thermalConductivity: 0.022,
    density: 850,
    specificHeat: 2100,
    costPerUnit: 180,
    category: 'Advanced Thermal',
    description: 'Latent heat storage material for passive temperature regulation'
  },
  {
    name: 'Standard Brick Masonry',
    thermalConductivity: 0.72,
    density: 1900,
    specificHeat: 840,
    costPerUnit: 80,
    category: 'Structural',
    description: 'Standard kiln-fired clay brick with mortar joints'
  },
  {
    name: 'Autoclaved Aerated Concrete (AAC)',
    thermalConductivity: 0.16,
    density: 600,
    specificHeat: 1000,
    costPerUnit: 110,
    category: 'Structural Insulation',
    description: 'Precast lightweight foam concrete blocks with thermal mass'
  },
  {
    name: 'Glass Mineral Wool Batts',
    thermalConductivity: 0.038,
    density: 24,
    specificHeat: 840,
    costPerUnit: 65,
    category: 'Insulation',
    description: 'Flexible fibrous insulation for roof rafters and wall cavities'
  },
  {
    name: 'Expanded Polystyrene (EPS)',
    thermalConductivity: 0.036,
    density: 25,
    specificHeat: 1200,
    costPerUnit: 75,
    category: 'Insulation',
    description: 'Rigid closed-cell cellular plastic insulation boards'
  }
];

export const getMaterialsCatalog = async (_req, res, next) => {
  try {
    // 1. Try to load from MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      const dbMaterials = await Material.find({
        isActive: { $ne: false },
        thermalConductivityWmK: { $gt: 0 }
      }).lean();

      if (dbMaterials.length > 0) {
        const formatted = dbMaterials.map((m) => ({
          id: m._id.toString(),
          materialCode: m.materialCode,
          name: m.name,
          thermalConductivity: m.thermalConductivityWmK,
          density: m.densityKgM3 ?? undefined,
          specificHeat: m.specificHeatJKgK ?? undefined,
          costPerUnit: m.costPerUnit ?? undefined,
          category: m.family || 'General',
          description: m.baseMaterial || `${m.name} (${m.family || 'Thermal Material'})`
        }));

        return res.status(200).json({
          success: true,
          source: 'mongodb-materials',
          status: 'ready',
          data: formatted
        });
      }
    }

    // 2. Try to load from materials.json if available and not empty
    if (fs.existsSync(materialsJsonPath)) {
      try {
        const dataset = JSON.parse(fs.readFileSync(materialsJsonPath, 'utf8'));
        if (Array.isArray(dataset.materials) && dataset.materials.length > 0) {
          return res.status(200).json({
            success: true,
            source: 'local-json-dataset',
            status: dataset.status || 'ready',
            data: dataset.materials
          });
        }
      } catch (err) {
        console.warn('[MaterialController] Error reading materials.json:', err.message);
      }
    }

    // 3. Fallback to validated default materials
    return res.status(200).json({
      success: true,
      source: 'shelterx-validated-catalog',
      status: 'ready',
      data: FALLBACK_MATERIALS
    });
  } catch (error) {
    next(error);
  }
};

export const getValidatedMaterials = async (_req, res, next) => {
  try {
    const materials = await listValidatedMaterials();
    return res.status(200).json({
      success: true,
      count: materials.length,
      materials
    });
  } catch (error) {
    next(error);
  }
};

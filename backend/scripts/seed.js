import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Material from '../models/material.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const sampleMaterials = [
  {
    materialCode: 'PUF_SANDWICH_01',
    family: 'Insulation',
    name: 'Polyurethane Foam (PUF) Composite Panel',
    baseMaterial: 'Polyurethane Rigid Foam Core',
    thermalConductivityWmK: 0.024,
    densityKgM3: 40,
    specificHeatJKgK: 1400,
    costPerUnit: 140,
    isActive: true
  },
  {
    materialCode: 'PCM_COMPOSITE_02',
    family: 'Advanced Thermal',
    name: 'Composite Phase Change Material (PCM)',
    baseMaterial: 'Paraffin/Graphite Matrix',
    thermalConductivityWmK: 0.022,
    densityKgM3: 850,
    specificHeatJKgK: 2100,
    costPerUnit: 180,
    isActive: true
  },
  {
    materialCode: 'VIP_AEROGEL_03',
    family: 'Insulation',
    name: 'Aerogel Vacuum Insulated Panel (VIP)',
    baseMaterial: 'Silica Aerogel Core',
    thermalConductivityWmK: 0.016,
    densityKgM3: 140,
    specificHeatJKgK: 1000,
    costPerUnit: 310,
    isActive: true
  },
  {
    materialCode: 'AAC_BLOCK_04',
    family: 'Structural',
    name: 'Autoclaved Aerated Concrete (AAC)',
    baseMaterial: 'Cellular Aerated Concrete',
    thermalConductivityWmK: 0.16,
    densityKgM3: 600,
    specificHeatJKgK: 1000,
    costPerUnit: 110,
    isActive: true
  },
  {
    materialCode: 'ROCKWOOL_CORE_05',
    family: 'Insulation',
    name: 'High-Density Rockwool Core Sandwich',
    baseMaterial: 'Basalt Mineral Wool',
    thermalConductivityWmK: 0.040,
    densityKgM3: 110,
    specificHeatJKgK: 840,
    costPerUnit: 95,
    isActive: true
  },
  {
    materialCode: 'BRICK_STD_06',
    family: 'Masonry',
    name: 'Standard Kiln Brick',
    baseMaterial: 'Burnt Clay',
    thermalConductivityWmK: 0.72,
    densityKgM3: 1900,
    specificHeatJKgK: 840,
    costPerUnit: 80,
    isActive: true
  }
];

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('Error: MONGO_URI is missing in backend/.env file.');
      process.exit(1);
    }

    console.log('Connecting to MongoDB for Seeding...');
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully.');

    for (const mat of sampleMaterials) {
      await Material.updateOne(
        { materialCode: mat.materialCode },
        { $set: mat },
        { upsert: true }
      );
    }

    console.log(`Successfully seeded ${sampleMaterials.length} sample materials.`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Seeding Error:', err.message);
    process.exit(1);
  }
};

seedDB();

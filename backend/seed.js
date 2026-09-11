import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Material from './models/material.js';

dotenv.config();

const sampleMaterials = [
    {
        name: "Composite Phase Change Material (PCM)",
        thermalConductivity: 0.022,
        specificHeat: 2100,
        density: 850,
        costPerUnit: 180
    },
    {
        name: "PUF Insulated Panels",
        thermalConductivity: 0.024,
        specificHeat: 1400,
        density: 40,
        costPerUnit: 140
    },
    {
        name: "Standard Brick",
        thermalConductivity: 0.7,
        specificHeat: 840,
        density: 1900,
        costPerUnit: 80
    },
    {
        name: "Insulated Concrete Form",
        thermalConductivity: 0.035,
        specificHeat: 1000,
        density: 1200,
        costPerUnit: 150
    },
    {
        name: "Autoclaved Aerated Concrete (AAC)",
        thermalConductivity: 0.16,
        specificHeat: 1000,
        density: 600,
        costPerUnit: 110
    },
    {
        name: "Timber Stud Wall with Insulation",
        thermalConductivity: 0.04,
        specificHeat: 1200,
        density: 500,
        costPerUnit: 130
    }
];

const seedDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error("Error: MONGO_URI is missing in backend/.env file.");
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected for Seeding.");

        await Material.deleteMany({});
        console.log("Cleared existing materials.");

        await Material.insertMany(sampleMaterials);
        console.log("Sample materials seeded successfully!");

        process.exit(0);
    } catch (err) {
        console.error("Seeding Error:", err.message);
        process.exit(1);
    }
};

seedDB();

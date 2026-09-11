import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Material from './models/material.js';
import { fetchNistMaterials } from './services/nistService.js';

dotenv.config();

const seedNistDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error("Error: MONGO_URI is missing in backend/.env file.");
            process.exit(1);
        }

        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected for NIST Seeding.");

        const nistMaterials = await fetchNistMaterials();

        if (!nistMaterials || !nistMaterials.length) {
            console.error("No NIST materials fetched. Aborting database update.");
            process.exit(1);
        }

        console.log("Upserting NIST materials into MongoDB...");
        
        let insertedCount = 0;
        let updatedCount = 0;
        let unchangedCount = 0;

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
            } else {
                unchangedCount++;
            }
        }

        console.log(`\n========================================`);
        console.log(`NIST Database Seeding Summary:`);
        console.log(`- Total Materials Processed : ${nistMaterials.length}`);
        console.log(`- New Materials Inserted    : ${insertedCount}`);
        console.log(`- Existing Materials Updated: ${updatedCount}`);
        console.log(`- Unchanged Materials       : ${unchangedCount}`);
        console.log(`========================================\n`);

        process.exit(0);
    } catch (err) {
        console.error("NIST Seeding Error:", err.message);
        process.exit(1);
    }
};

seedNistDB();

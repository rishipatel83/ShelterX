import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGO_URI?.trim();
  if (!uri) {
    console.warn('[ShelterX] MONGO_URI not set; running without persistence.');
    return false;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('[ShelterX] MongoDB connected.');
    return true;
  } catch (error) {
    console.warn(`[ShelterX] MongoDB unavailable: ${error.message}`);
    console.warn('[ShelterX] Continuing without persistence.');
    return false;
  }
};

import mongoose from 'mongoose';

const connectDB = async ({ required = false } = {}) => {
  const mongoUri = process.env.MONGO_URI?.trim();

  if (!mongoUri) {
    const message = 'MONGO_URI is not configured.';
    if (required) throw new Error(message);
    console.warn(`${message} Database-backed features will be unavailable.`);
    return false;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000
    });

    console.log('MongoDB connected successfully.');
    return true;
  } catch (error) {
    if (required) {
      throw new Error(`MongoDB connection failed: ${error.message}`);
    }

    console.error('MongoDB connection failed:', error.message);
    return false;
  }
};

export default connectDB;

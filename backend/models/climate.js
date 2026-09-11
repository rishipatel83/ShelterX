import mongoose from 'mongoose';

const climateSchema = new mongoose.Schema({
    locationName: { type: String, required: true },
    lat: Number,
    lon: Number,
    cachedWeatherData: Array,
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Climate', climateSchema);
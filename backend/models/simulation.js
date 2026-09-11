import mongoose from 'mongoose';

const simulationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dimensions: { length: Number, width: Number, height: Number },
    materialUsed: { type: String, required: true },
    coordinates: { lat: Number, lon: Number },
    interiorTemperatureResult: { type: Number, required: true },
    costEvaluation: { type: Number },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Simulation', simulationSchema);
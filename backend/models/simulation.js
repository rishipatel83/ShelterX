import mongoose from 'mongoose';

const simulationSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, index: true },
    userId: { type: String, default: null },
    inputs: { type: mongoose.Schema.Types.Mixed, required: true },
    derivedGeometry: { type: mongoose.Schema.Types.Mixed, default: null },
    weather: { type: mongoose.Schema.Types.Mixed, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true, strict: false }
);

export default mongoose.model('Simulation', simulationSchema);

import mongoose from 'mongoose';

const simulationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    schemaVersion: {
      type: String,
      default: null
    },
    status: {
      type: String,
      default: null,
      index: true
    },
    inputs: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    material: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    weather: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    thermalResult: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    costResult: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    recommendation: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    // Legacy fields retained for compatibility with older stored documents.
    ansysResult: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    modelPrediction: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

export default mongoose.model('Simulation', simulationSchema);

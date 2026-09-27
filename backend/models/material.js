import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema(
  {
    materialCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    family: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    baseMaterial: {
      type: String,
      default: null
    },

    thermalConductivityWmK: {
      type: Number,
      default: null
    },
    conductivityReferenceTempC: {
      type: Number,
      default: null
    },
    densityKgM3: {
      type: Number,
      default: null
    },
    densityBasis: {
      type: String,
      default: null
    },
    specificHeatJKgK: {
      type: Number,
      default: null
    },

    sourceOrg: {
      type: String,
      default: null
    },
    sourceTitle: {
      type: String,
      default: null
    },
    sourceUrl: {
      type: String,
      default: null
    },
    sourceType: {
      type: String,
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

export default mongoose.model('Material', materialSchema);

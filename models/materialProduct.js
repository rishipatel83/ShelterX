import mongoose from 'mongoose';

const materialProductSchema = new mongoose.Schema(
  {
    externalProductCode: {
      type: String,
      default: null
    },

    // Price listings may only be a family-level market proxy.
    // Link materialId only when the supplier product is verified as an exact
    // match to a thermal-property Material record.
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material',
      default: null,
      index: true
    },

    priceFamily: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true
    },

    productName: {
      type: String,
      required: true,
      trim: true
    },

    thicknessMinMm: {
      type: Number,
      default: null
    },
    thicknessMaxMm: {
      type: Number,
      default: null
    },
    densityMinKgM3: {
      type: Number,
      default: null
    },
    densityMaxKgM3: {
      type: Number,
      default: null
    },

    pieceLengthM: {
      type: Number,
      default: null
    },
    pieceWidthM: {
      type: Number,
      default: null
    },
    pieceThicknessMm: {
      type: Number,
      default: null
    },
    coverageAreaM2: {
      type: Number,
      default: null
    },
    volumeM3PerPiece: {
      type: Number,
      default: null
    },

    sourceProductUrl: {
      type: String,
      default: null
    },
    availabilityStatus: {
      type: String,
      default: null
    },
    notes: {
      type: String,
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

materialProductSchema.index(
  { supplierId: 1, productName: 1 },
  { unique: true }
);

export default mongoose.model('MaterialProduct', materialProductSchema);

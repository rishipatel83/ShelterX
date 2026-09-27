import mongoose from 'mongoose';

const PRICE_UNITS = [
  'square_meter',
  'square_foot',
  'cubic_meter',
  'piece'
];

const materialPriceSchema = new mongoose.Schema(
  {
    externalPriceCode: {
      type: String,
      default: null,
      unique: true,
      sparse: true
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaterialProduct',
      required: true,
      index: true
    },

    priceInr: {
      type: Number,
      required: true,
      min: 0
    },
    priceUnit: {
      type: String,
      required: true,
      enum: PRICE_UNITS
    },
    currency: {
      type: String,
      default: 'INR'
    },

    gstPercent: {
      type: Number,
      default: null
    },
    minimumOrderQty: {
      type: Number,
      default: null
    },
    minimumOrderUnit: {
      type: String,
      default: null
    },

    region: {
      type: String,
      default: null
    },
    city: {
      type: String,
      default: null
    },
    state: {
      type: String,
      default: null,
      index: true
    },
    country: {
      type: String,
      default: 'India'
    },

    sourceUrl: {
      type: String,
      default: null
    },
    sourceCheckedAt: {
      type: Date,
      default: null,
      index: true
    },
    validFrom: {
      type: Date,
      default: null
    },
    validUntil: {
      type: Date,
      default: null
    },

    matchType: {
      type: String,
      default: null
    },
    notes: {
      type: String,
      default: null
    },

    // Keep older price records for history; deactivate rather than overwrite.
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

materialPriceSchema.index({ productId: 1, isActive: 1 });
materialPriceSchema.index({ state: 1, isActive: 1 });
materialPriceSchema.index({ sourceCheckedAt: -1 });

export { PRICE_UNITS };
export default mongoose.model('MaterialPrice', materialPriceSchema);

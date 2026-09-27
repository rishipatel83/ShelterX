import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    website: {
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
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

supplierSchema.index(
  { name: 1, city: 1, state: 1, country: 1 },
  { unique: true }
);

export default mongoose.model('Supplier', supplierSchema);

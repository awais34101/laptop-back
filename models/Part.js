import mongoose from 'mongoose';

const partSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true, default: '' },
  unit: { type: String, trim: true, default: 'pcs' },
  minStock: { type: Number, default: 0 },
  average_price: { type: Number, default: 0 },
  last_buy_price: { type: Number, default: 0 },
  last_buy_date: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

partSchema.index({ name: 1 }, { unique: false });
partSchema.index({ sku: 1 }, { unique: false });

export default mongoose.model('Part', partSchema);

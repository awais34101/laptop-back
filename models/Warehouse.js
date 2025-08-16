import mongoose from 'mongoose';

const warehouseSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, unique: true },
  quantity: { type: Number, required: true, default: 0 },
});

// Ensure a unique index on item
warehouseSchema.index({ item: 1 }, { unique: true });

export default mongoose.model('Warehouse', warehouseSchema);

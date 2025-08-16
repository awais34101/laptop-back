import mongoose from 'mongoose';

const partsWarehouseSchema = new mongoose.Schema({
  part: { type: mongoose.Schema.Types.ObjectId, ref: 'Part', required: true, unique: true },
  quantity: { type: Number, default: 0 },
});

partsWarehouseSchema.index({ part: 1 }, { unique: true });

export default mongoose.model('PartsWarehouse', partsWarehouseSchema);

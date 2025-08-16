import mongoose from 'mongoose';

const partsStoreSchema = new mongoose.Schema({
  part: { type: mongoose.Schema.Types.ObjectId, ref: 'Part', required: true, unique: true },
  remaining_quantity: { type: Number, default: 0 },
});

partsStoreSchema.index({ part: 1 }, { unique: true });

export default mongoose.model('PartsStore', partsStoreSchema);

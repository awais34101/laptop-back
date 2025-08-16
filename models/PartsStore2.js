import mongoose from 'mongoose';

const partsStore2Schema = new mongoose.Schema({
  part: { type: mongoose.Schema.Types.ObjectId, ref: 'Part', required: true, unique: true },
  remaining_quantity: { type: Number, default: 0 },
});

partsStore2Schema.index({ part: 1 }, { unique: true });

export default mongoose.model('PartsStore2', partsStore2Schema);

import mongoose from 'mongoose';

const partsTransferSchema = new mongoose.Schema({
  items: [{ part: { type: mongoose.Schema.Types.ObjectId, ref: 'Part', required: true }, quantity: { type: Number, required: true } }],
  from: { type: String, enum: ['warehouse', 'store', 'store2'], required: true },
  to: { type: String, enum: ['warehouse', 'store', 'store2'], required: true },
  date: { type: Date, default: Date.now },
  note: { type: String, default: '' },
});

partsTransferSchema.index({ date: -1 });

export default mongoose.model('PartsTransfer', partsTransferSchema);

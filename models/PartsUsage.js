import mongoose from 'mongoose';

const partsUsageSchema = new mongoose.Schema({
  items: [{
    part: { type: mongoose.Schema.Types.ObjectId, ref: 'Part', required: true },
    quantity: { type: Number, required: true },
  }],
  from: { type: String, enum: ['warehouse', 'store', 'store2'], required: true },
  technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true },
  usedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, default: '' },
  date: { type: Date, default: Date.now },
});

partsUsageSchema.index({ date: -1 });

export default mongoose.model('PartsUsage', partsUsageSchema);

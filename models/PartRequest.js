import mongoose from 'mongoose';

const partRequestSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  quantity: { type: Number, required: true, min: 1 },
  note: { type: String, default: '' },
  status: { type: String, enum: ['requested', 'approved', 'ordered', 'received', 'rejected', 'cancelled'], default: 'requested' },
  requestedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedByTechnician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', default: null },
  date: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

partRequestSchema.index({ status: 1, date: -1 });

export default mongoose.model('PartRequest', partRequestSchema);

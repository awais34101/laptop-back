import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  number: { type: String, default: '' },
  issueDate: { type: Date, default: null },
  expiryDate: { type: Date, default: null, index: true },
  note: { type: String, default: '' },
  attachments: [{ type: String }], // URLs/paths to files
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

documentSchema.index({ category: 1, expiryDate: 1 });

documentSchema.index({ name: 'text', number: 'text', category: 'text' });

export default mongoose.model('Document', documentSchema);

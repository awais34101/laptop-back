import mongoose from 'mongoose';

const transferSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  quantity: { type: Number, required: true },
  direction: { type: String, enum: ['store-to-warehouse', 'warehouse-to-store'], required: true },
  date: { type: Date, default: Date.now },
  technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician' },
  workType: { type: String, enum: ['repair', 'test'] },
});

export default mongoose.model('Transfer', transferSchema);

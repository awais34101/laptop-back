import mongoose from 'mongoose';

const transferSchema = new mongoose.Schema({
  items: [
    {
      item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
      quantity: { type: Number, required: true },
    }
  ],
  from: { type: String, enum: ['warehouse', 'store', 'store2'], required: true },
  to: { type: String, enum: ['warehouse', 'store', 'store2'], required: true },
  date: { type: Date, default: Date.now },
  technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician' },
  workType: { type: String, enum: ['repair', 'test'] },
});

export default mongoose.model('Transfer', transferSchema);

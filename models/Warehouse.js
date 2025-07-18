import mongoose from 'mongoose';

const warehouseSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  quantity: { type: Number, required: true, default: 0 },
});

export default mongoose.model('Warehouse', warehouseSchema);

import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  remaining_quantity: { type: Number, required: true, default: 0 },
});

export default mongoose.model('Store', storeSchema);

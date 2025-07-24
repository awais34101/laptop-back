import mongoose from 'mongoose';

const store2Schema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, unique: true },
  remaining_quantity: { type: Number, required: true, default: 0 },
  last_sale_date: { type: Date },
  sale_count: { type: Number, default: 0 },
});

export default mongoose.model('Store2', store2Schema);

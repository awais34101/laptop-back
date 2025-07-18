import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  unit: { type: String, required: true },
  category: { type: String, required: true },
  average_price: { type: Number, required: true, default: 0 },
  last_sale_date: { type: Date },
  sale_count: { type: Number, default: 0 },
});

export default mongoose.model('Item', itemSchema);

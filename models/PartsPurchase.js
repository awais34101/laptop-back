import mongoose from 'mongoose';

const partsPurchaseSchema = new mongoose.Schema({
  items: [{
    part: { type: mongoose.Schema.Types.ObjectId, ref: 'Part', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }, // unit price
  }],
  date: { type: Date, default: Date.now },
  supplier: { type: String, default: '' },
  invoice_number: { type: String, default: '' },
  note: { type: String, default: '' },
});

partsPurchaseSchema.index({ date: -1 });

export default mongoose.model('PartsPurchase', partsPurchaseSchema);

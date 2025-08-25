import mongoose from 'mongoose';

const returnStore2Schema = new mongoose.Schema({
  items: [
    {
      item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ],
  customer: { type: String, required: true },
  invoice_number: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

returnStore2Schema.index({ date: -1 });
returnStore2Schema.index({ customer: 1, invoice_number: 1 }, { unique: true });

export default mongoose.model('ReturnStore2', returnStore2Schema);

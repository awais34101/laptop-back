import mongoose from 'mongoose';

const saleStore2Schema = new mongoose.Schema({
  items: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
  }],
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  invoice_number: { type: String },
  date: { type: Date, default: Date.now },
});

export default mongoose.model('SaleStore2', saleStore2Schema);

import mongoose from 'mongoose';


const saleSchema = new mongoose.Schema({
  items: [
    {
      item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    }
  ],
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  invoice_number: { type: String },
  date: { type: Date, default: Date.now },
});

export default mongoose.model('Sale', saleSchema);

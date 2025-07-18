import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema({
  items: [
    {
      item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ],
  supplier: { type: String, required: true },
  invoice_number: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

export default mongoose.model('Purchase', purchaseSchema);

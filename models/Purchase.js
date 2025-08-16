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

// Indexes for faster date filtering
purchaseSchema.index({ date: -1 });
// Business rule: prevent duplicate invoice numbers per supplier
purchaseSchema.index({ supplier: 1, invoice_number: 1 }, { unique: true });

export default mongoose.model('Purchase', purchaseSchema);

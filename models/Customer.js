import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: false },
  email: { type: String, required: false },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.model('Customer', customerSchema);

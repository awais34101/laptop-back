import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'staff'], default: 'staff' },
  canViewFinancials: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  passwordVersion: { type: Number, default: 1 },
}, { timestamps: true });

export default mongoose.model('User', userSchema);

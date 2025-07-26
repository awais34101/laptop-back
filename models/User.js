import mongoose from 'mongoose';

const fullPermissions = {
  dashboard: { view: true },
  items: { view: true, edit: true, delete: true },
  purchases: { view: true, edit: true, delete: true },
  warehouse: { view: true, edit: true, delete: true },
  sales: { view: true, edit: true, delete: true },
  customers: { view: true, edit: true, delete: true },
  technicians: { view: true, edit: true, delete: true },
  transfers: { view: true, edit: true, delete: true },
  store: { view: true, edit: true, delete: true },
  store2: { view: true, edit: true, delete: true },
  settings: { view: true, edit: true },
  users: { view: true, edit: true, delete: true },
};

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'staff', 'technician'], default: 'staff' },
  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', default: null },
  canViewFinancials: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  passwordVersion: { type: Number, default: 1 },
  permissions: {
    type: Object,
    default: function() {
      // If admin, always full permissions
      if (this.role === 'admin') return fullPermissions;
      return {};
    }
  },
}, { timestamps: true });


// Always return full permissions for admin
userSchema.methods.getEffectivePermissions = function() {
  if (this.role === 'admin') return fullPermissions;
  return this.permissions || {};
};

export default mongoose.model('User', userSchema);

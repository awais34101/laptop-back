import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  low_stock_days: { type: Number, default: 7 },
  slow_moving_days: { type: Number, default: 30 },
  auto_delete_sales_days: { type: Number, default: 365 }, // Auto delete sales invoices after X days
  auto_delete_purchase_days: { type: Number, default: 365 }, // Auto delete purchase invoices after X days
  auto_delete_transfer_days: { type: Number, default: 180 }, // Auto delete transfer history after X days
  auto_delete_checklist_days: { type: Number, default: 90 }, // Auto delete checklist reports after X days
  enable_auto_delete: { type: Boolean, default: false }, // Enable/disable auto delete feature
});

export default mongoose.model('Settings', settingsSchema);

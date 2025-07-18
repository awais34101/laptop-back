import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  low_stock_days: { type: Number, default: 7 },
  slow_moving_days: { type: Number, default: 30 },
});

export default mongoose.model('Settings', settingsSchema);

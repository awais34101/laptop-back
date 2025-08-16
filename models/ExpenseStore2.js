import mongoose from 'mongoose';

const expenseItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  category: { type: String, default: '' },
  amount: { type: Number, required: true, min: 0 },
});

const expenseStore2Schema = new mongoose.Schema({
  items: { type: [expenseItemSchema], required: true, validate: v => Array.isArray(v) && v.length > 0 },
  note: { type: String, default: '' },
  date: { type: Date, default: Date.now },
});

expenseStore2Schema.index({ date: -1 });

export default mongoose.model('ExpenseStore2', expenseStore2Schema);

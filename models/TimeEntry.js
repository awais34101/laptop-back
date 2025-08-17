import mongoose from 'mongoose';

const timeEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffName: { type: String, required: true }, // snapshot for easier reporting
  role: { type: String, required: true },
  date: { type: Date, required: true }, // normalized to midnight UTC for the day
  clockIn: { type: Date, required: true },
  clockOut: { type: Date, default: null },
  notes: { type: String, default: '' },
  durationMinutes: { type: Number, default: 0 }, // computed on clock out or manual update
}, { timestamps: true });

timeEntrySchema.index({ user: 1, date: 1 });

export default mongoose.model('TimeEntry', timeEntrySchema);

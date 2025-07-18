import mongoose from 'mongoose';

const technicianSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
});

export default mongoose.model('Technician', technicianSchema);

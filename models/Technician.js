import mongoose from 'mongoose';

const TechnicianSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
  },
  specialization: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  assignments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TechnicianAssignment',
  }],
  stats: {
    repair: { type: Number, default: 0 },
    test: { type: Number, default: 0 },
  },
});

const Technician = mongoose.model('Technician', TechnicianSchema);

export default Technician;

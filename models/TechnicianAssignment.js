import mongoose from 'mongoose';

const TechnicianAssignmentSchema = new mongoose.Schema({
  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true },
  itemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true }],
  createdAt: { type: Date, default: Date.now }
});

const TechnicianAssignment = mongoose.model('TechnicianAssignment', TechnicianAssignmentSchema);
export default TechnicianAssignment;

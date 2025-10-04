import mongoose from 'mongoose';

const SheetAssignmentSchema = new mongoose.Schema({
  purchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
    required: true,
    unique: true // Each purchase can only have one assignment
  },
  technicianId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Technician',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['assigned', 'in-progress', 'completed'],
    default: 'assigned'
  },
  notes: {
    type: String,
    default: ''
  },
  dueDate: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date
  }
});

// Index for faster queries
SheetAssignmentSchema.index({ technicianId: 1, status: 1 });
SheetAssignmentSchema.index({ purchaseId: 1 });

export default mongoose.model('SheetAssignment', SheetAssignmentSchema);
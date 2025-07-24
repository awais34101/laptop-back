import TechnicianAssignment from '../models/TechnicianAssignment.js';
import Technician from '../models/Technician.js';
import Item from '../models/Item.js';

// Get all assignments
export const getAssignments = async (req, res) => {
  try {
    const assignments = await TechnicianAssignment.find();
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Assign items to technician
export const createAssignment = async (req, res) => {
  try {
    const { technicianId, itemIds } = req.body;
    if (!technicianId || !itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({ error: 'Invalid data' });
    }
    // Remove previous assignments for this technician
    await TechnicianAssignment.deleteMany({ technicianId });
    // Save new assignment
    const assignment = new TechnicianAssignment({ technicianId, itemIds });
    await assignment.save();
    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

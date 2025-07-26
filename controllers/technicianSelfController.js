import TechnicianAssignment from '../models/TechnicianAssignment.js';
import Technician from '../models/Technician.js';
import Transfer from '../models/Transfer.js';

// Get items assigned to the logged-in technician
export const getMyAssignedItems = async (req, res) => {
  try {
    let technicianId = req.user.technicianId;
    // Auto-link if user is technician but has no technicianId
    if (!technicianId && req.user.role === 'technician') {
      const tech = await Technician.findOne({ name: req.user.name });
      if (tech) {
        technicianId = tech._id;
      }
    }
    if (!technicianId) return res.status(400).json({ error: 'No technician linked to user. Please ensure this user is assigned to a technician.' });
    const assignment = await TechnicianAssignment.findOne({ technicianId }).populate('itemIds');
    res.json(assignment ? assignment.itemIds : []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get stats for the logged-in technician
export const getMyStats = async (req, res) => {
  try {
    let technicianId = req.user.technicianId;
    // Auto-link if user is technician but has no technicianId
    if (!technicianId && req.user.role === 'technician') {
      const tech = await Technician.findOne({ name: req.user.name });
      if (tech) {
        technicianId = tech._id;
      }
    }
    if (!technicianId) return res.status(400).json({ error: 'No technician linked to user. Please ensure this user is assigned to a technician.' });

    // Support optional date filtering
    const { from, to } = req.query;
    const filter = { technician: technicianId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const transfers = await Transfer.find(filter).populate('items.item');
    let repair = 0, test = 0, items = [];
    for (const t of transfers) {
      if (Array.isArray(t.items) && t.items.length > 0) {
        for (const itemObj of t.items) {
          const qty = Number(itemObj.quantity) || 0;
          const itemName = itemObj.item?.name || itemObj.item?.model || itemObj.item?.toString?.() || 'Unknown';
          items.push({ name: itemName, quantity: qty, workType: t.workType });
          if (t.workType === 'repair') repair += qty;
          if (t.workType === 'test') test += qty;
        }
      }
    }
    res.json({ repair, test, items });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

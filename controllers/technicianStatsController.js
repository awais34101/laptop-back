import Transfer from '../models/Transfer.js';
import Technician from '../models/Technician.js';

export const getTechnicianStats = async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const transfers = await Transfer.find(filter).populate('technician');
    // Aggregate by technician and workType
    const stats = {};
    for (const t of transfers) {
      if (!t.technician) continue;
      if (!stats[t.technician._id]) {
        stats[t.technician._id] = { name: t.technician.name, repair: 0, test: 0 };
      }
      if (t.workType === 'repair') stats[t.technician._id].repair += t.quantity;
      if (t.workType === 'test') stats[t.technician._id].test += t.quantity;
    }
    res.json(Object.values(stats));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

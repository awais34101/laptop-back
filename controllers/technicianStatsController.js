import Technician from '../models/Technician.js';
import Transfer from '../models/Transfer.js';

export const getTechnicianStats = async (req, res) => {
  try {
    const { from, to } = req.query;
    
    // Build date filter for transfers
    const transferFilter = {};
    if (from || to) {
      transferFilter.date = {};
      if (from) transferFilter.date.$gte = new Date(from);
      if (to) transferFilter.date.$lte = new Date(to);
    }

    // Get all technicians
    const technicians = await Technician.find();
    
    // Calculate stats for each technician
    const statsPromises = technicians.map(async (technician) => {
      const filter = { ...transferFilter, technician: technician._id };
      const transfers = await Transfer.find(filter);
      
      let repair = 0;
      let test = 0;
      
      transfers.forEach(transfer => {
        if (transfer.workType === 'repair') {
          if (Array.isArray(transfer.items)) {
            repair += transfer.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
          }
        } else if (transfer.workType === 'test') {
          if (Array.isArray(transfer.items)) {
            test += transfer.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
          }
        }
      });
      
      return {
        _id: technician._id,
        name: technician.name,
        email: technician.email,
        phone: technician.phone,
        specialization: technician.specialization,
        repair,
        test
      };
    });

    const stats = await Promise.all(statsPromises);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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
    // Aggregate by technician and workType, support old and new formats
    const stats = {};
    for (const t of transfers) {
      if (!t.technician) continue;
      if (!stats[t.technician._id]) {
        stats[t.technician._id] = { name: t.technician.name, repair: 0, test: 0, items: [] };
      }
      // Helper to add/merge item
      const addOrMergeItem = (techId, itemName, qty, workType) => {
        if (qty > 0) {
          const itemsArr = stats[techId].items;
          const found = itemsArr.find(i => i.name === itemName && i.workType === workType);
          if (found) {
            found.quantity += qty;
          } else {
            itemsArr.push({ name: itemName, quantity: qty, workType });
          }
        }
      };
      // New format: items array
      if (Array.isArray(t.items) && t.items.length > 0) {
        for (const itemObj of t.items) {
          const qty = Number(itemObj.quantity) || 0;
          const itemName = itemObj.item?.name || itemObj.item?.model || itemObj.item?.toString?.() || 'Unknown';
          addOrMergeItem(t.technician._id, itemName, qty, t.workType);
          if (t.workType === 'repair') stats[t.technician._id].repair += qty;
          if (t.workType === 'test') stats[t.technician._id].test += qty;
        }
      } else if (t.item && t.quantity) {
        // Old format: top-level item and quantity
        const qty = Number(t.quantity) || 0;
        const itemName = t.item?.name || t.item?.model || t.item?.toString?.() || 'Unknown';
        addOrMergeItem(t.technician._id, itemName, qty, t.workType);
        if (t.workType === 'repair') stats[t.technician._id].repair += qty;
        if (t.workType === 'test') stats[t.technician._id].test += qty;
      } else if (typeof t.quantity === 'number') {
        // Old format: single quantity field
        const qty = Number(t.quantity) || 0;
        addOrMergeItem(t.technician._id, 'Unknown', qty, t.workType);
        if (t.workType === 'repair') stats[t.technician._id].repair += qty;
        if (t.workType === 'test') stats[t.technician._id].test += qty;
      }
    }
    res.json(Object.values(stats));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

import Joi from 'joi';
import PartsWarehouse from '../models/PartsWarehouse.js';
import PartsStore from '../models/PartsStore.js';
import PartsStore2 from '../models/PartsStore2.js';
import PartsUsage from '../models/PartsUsage.js';

const validLoc = ['warehouse','store','store2'];
const useSchema = Joi.object({ from: Joi.string().valid(...validLoc).required(), technician: Joi.string().required(), items: Joi.array().items(Joi.object({ part: Joi.string().required(), quantity: Joi.number().min(1).required() })).min(1).required(), note: Joi.string().allow('') });

export const useParts = async (req, res) => {
  try {
    const { error, value } = useSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { from, items, technician, note } = value;
    const getModel = (loc) => loc === 'warehouse' ? PartsWarehouse : loc === 'store' ? PartsStore : PartsStore2;
    const getField = (loc) => loc === 'warehouse' ? 'quantity' : 'remaining_quantity';

    // Check availability
    for (const it of items) {
      const From = getModel(from);
      const f = await From.findOne({ part: it.part });
      const qty = f ? f[getField(from)] : 0;
      if (!f || qty < it.quantity) return res.status(400).json({ error: `Not enough stock in ${from}` });
    }

    // Deduct
    for (const it of items) {
      const From = getModel(from);
      const f = await From.findOne({ part: it.part });
      f[getField(from)] -= it.quantity;
      await f.save();
    }
    // Record usage log
  const rec = await PartsUsage.create({ items, from, technician, usedByUser: req.user.userId, note });
    res.json({ success: true, usage: rec });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const listPartsUsage = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const [total, rows] = await Promise.all([
      PartsUsage.countDocuments(),
      PartsUsage.find().sort({ date: -1 }).skip(skip).limit(limit).populate('items.part').populate('technician').populate('usedByUser')
    ]);
    res.json({ data: rows, total, page, pageSize: limit, totalPages: Math.ceil(total/limit)||1 });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

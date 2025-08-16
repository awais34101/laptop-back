import Joi from 'joi';
import Part from '../models/Part.js';
import PartsWarehouse from '../models/PartsWarehouse.js';
import PartsStore from '../models/PartsStore.js';
import PartsStore2 from '../models/PartsStore2.js';
import PartsTransfer from '../models/PartsTransfer.js';

const partSchema = Joi.object({
  name: Joi.string().min(1).required(),
  sku: Joi.string().allow(''),
  unit: Joi.string().allow(''),
  minStock: Joi.number().min(0).default(0),
});

export const listParts = async (req, res) => {
  try {
    const parts = await Part.find().sort({ name: 1 });
    res.json(parts);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const createPart = async (req, res) => {
  try {
    const { error, value } = partSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const part = await Part.create(value);
    res.status(201).json(part);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const updatePart = async (req, res) => {
  try {
    const { error, value } = partSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const part = await Part.findByIdAndUpdate(req.params.id, value, { new: true });
    if (!part) return res.status(404).json({ error: 'Part not found' });
    res.json(part);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const deletePart = async (req, res) => {
  try {
    await Part.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Inventory snapshots across locations
export const getPartsInventory = async (req, res) => {
  try {
    const [wh, s1, s2] = await Promise.all([
      PartsWarehouse.find().populate('part'),
      PartsStore.find().populate('part'),
      PartsStore2.find().populate('part'),
    ]);
    res.json({ warehouse: wh, store: s1, store2: s2 });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Transfer between parts locations
const validLoc = ['warehouse','store','store2'];
export const transferParts = async (req, res) => {
  try {
    const schema = Joi.object({
      from: Joi.string().valid(...validLoc).required(),
      to: Joi.string().valid(...validLoc).required(),
      items: Joi.array().items(Joi.object({ part: Joi.string().required(), quantity: Joi.number().min(1).required() })).min(1).required(),
      note: Joi.string().allow(''),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { from, to, items, note } = value;
    if (from === to) return res.status(400).json({ error: 'Source and destination must be different' });

    const getModel = (loc) => loc === 'warehouse' ? PartsWarehouse : loc === 'store' ? PartsStore : PartsStore2;
    const getField = (loc) => loc === 'warehouse' ? 'quantity' : 'remaining_quantity';

    // Check availability first
    for (const it of items) {
      const From = getModel(from);
      const f = await From.findOne({ part: it.part });
      const qty = f ? f[getField(from)] : 0;
      if (!f || qty < it.quantity) return res.status(400).json({ error: `Not enough stock in ${from}` });
    }

    // Apply movement
    for (const it of items) {
      const From = getModel(from); const To = getModel(to);
      const fromDoc = await From.findOne({ part: it.part });
      let toDoc = await To.findOne({ part: it.part });
      fromDoc[getField(from)] -= it.quantity; await fromDoc.save();
      if (toDoc) { toDoc[getField(to)] += it.quantity; await toDoc.save(); }
      else {
        const payload = { part: it.part };
        payload[getField(to)] = it.quantity;
        await To.create(payload);
      }
    }

    const rec = await PartsTransfer.create({ items, from, to, note });
    res.status(201).json(rec);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const listPartsTransfers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const [total, rows] = await Promise.all([
      PartsTransfer.countDocuments(),
      PartsTransfer.find().sort({ date: -1 }).skip(skip).limit(limit).populate('items.part')
    ]);
    res.json({ data: rows, total, page, pageSize: limit, totalPages: Math.ceil(total/limit)||1 });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

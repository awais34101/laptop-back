import Joi from 'joi';
import PartsPurchase from '../models/PartsPurchase.js';
import Part from '../models/Part.js';
import PartsWarehouse from '../models/PartsWarehouse.js';

const itemSchema = Joi.object({ part: Joi.string().required(), quantity: Joi.number().min(1).required(), price: Joi.number().min(0).required() });
const purchaseSchema = Joi.object({ items: Joi.array().items(itemSchema).min(1).required(), supplier: Joi.string().allow(''), invoice_number: Joi.string().allow(''), note: Joi.string().allow(''), date: Joi.date().optional() });

export const listPartsPurchases = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const q = (req.query.q || '').trim();
    const regex = q ? new RegExp(q, 'i') : null;
    let filter = {};
    if (regex) {
      const partIds = await Part.find({ name: regex }).distinct('_id');
      filter = { $or: [{ supplier: regex }, { invoice_number: regex }, { note: regex }, { 'items.part': { $in: partIds } }] };
    }
    const [total, rows] = await Promise.all([
      PartsPurchase.countDocuments(filter),
      PartsPurchase.find(filter).sort({ date: -1 }).skip(skip).limit(limit).populate('items.part')
    ]);
    res.json({ data: rows, total, page, pageSize: limit, totalPages: Math.ceil(total/limit)||1 });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const deletePartsPurchase = async (req, res) => {
  try {
    const doc = await PartsPurchase.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Parts purchase not found' });
    // Per requirement: do not affect inventory when deleting history
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const createPartsPurchase = async (req, res) => {
  try {
    const { error, value } = purchaseSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { items } = value;

    // Apply to warehouse inventory by default
    for (const it of items) {
      let wh = await PartsWarehouse.findOne({ part: it.part });
      if (wh) { wh.quantity += it.quantity; await wh.save(); }
      else { await PartsWarehouse.create({ part: it.part, quantity: it.quantity }); }

      // Update part price stats
      const p = await Part.findById(it.part);
      if (p) {
        p.last_buy_price = it.price;
        p.last_buy_date = new Date();
        // Update average price (simple moving avg based on quantity)
        const prevQty = wh ? (wh.quantity - it.quantity) : 0;
        const prevValue = p.average_price * prevQty;
        const newValue = prevValue + (it.price * it.quantity);
        const newQty = prevQty + it.quantity;
        if (newQty > 0) p.average_price = newValue / newQty;
        await p.save();
      }
    }

    const rec = await PartsPurchase.create(value);
    res.status(201).json(rec);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

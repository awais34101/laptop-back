import Joi from 'joi';
import PartRequest from '../models/PartRequest.js';
import Item from '../models/Item.js';
import Part from '../models/Part.js';
import Purchase from '../models/Purchase.js';

const createSchema = Joi.object({
  item: Joi.string().required(),
  itemModel: Joi.string().valid('Item','Part').default('Item'),
  quantity: Joi.number().min(1).required(),
  note: Joi.string().allow(''),
});

const statusSchema = Joi.object({
  status: Joi.string().valid('requested','approved','ordered','received','rejected','cancelled').required(),
});

export const listPartRequests = async (req, res) => {
  try {
  const { status, page = 1, limit = 20 } = req.query;
    const p = Math.max(parseInt(page) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const skip = (p - 1) * l;
    const filter = {};
    if (status) filter.status = status;
    const [total, docs] = await Promise.all([
      PartRequest.countDocuments(filter),
      PartRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
        .populate({ path: 'item', select: 'name sku' })
        .populate('requestedByUser')
        .populate('requestedByTechnician')
    ]);
    res.json({ data: docs, total, page: p, pageSize: l, totalPages: Math.ceil(total/l)||1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createPartRequest = async (req, res) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const model = value.itemModel || 'Item';
    if (model === 'Item') {
      const item = await Item.findById(value.item);
      if (!item) return res.status(400).json({ error: 'Item not found' });
    } else {
      const part = await Part.findById(value.item);
      if (!part) return res.status(400).json({ error: 'Part not found' });
    }
    const requestedByUser = req.user?.userId;
    const requestedByTechnician = req.user?.technicianId || null;
    const created = await PartRequest.create({ ...value, requestedByUser, requestedByTechnician });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updatePartRequestStatus = async (req, res) => {
  try {
    const { error } = statusSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const doc = await PartRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    doc.status = req.body.status;
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deletePartRequest = async (req, res) => {
  try {
    const doc = await PartRequest.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Price history for same item from past purchases
export const getItemPriceHistory = async (req, res) => {
  try {
    const { itemId } = req.params;
    const purchases = await Purchase.find({ 'items.item': itemId }, { items: 1, invoice_number: 1, date: 1 })
      .sort({ date: -1 })
      .limit(50)
      .lean();
    const history = [];
    for (const p of purchases) {
      for (const it of p.items) {
        if (String(it.item) === String(itemId)) {
          history.push({ price: it.price, quantity: it.quantity, invoice_number: p.invoice_number, date: p.date });
        }
      }
    }
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

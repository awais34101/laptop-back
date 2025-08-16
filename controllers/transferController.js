import Transfer from '../models/Transfer.js';
import Warehouse from '../models/Warehouse.js';
import Store from '../models/Store.js';
import Store2 from '../models/Store2.js';
import Joi from 'joi';

const transferSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      item: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
    })
  ).min(1).required(),
  from: Joi.string().valid('warehouse', 'store', 'store2').required(),
  to: Joi.string().valid('warehouse', 'store', 'store2').required(),
  technician: Joi.string().optional().allow(null, ''),
  workType: Joi.string().valid('repair', 'test').optional().allow(null, ''),
});

export const getTransfers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const [total, transfers] = await Promise.all([
      Transfer.countDocuments(),
      Transfer.find()
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.item')
        .populate('technician')
    ]);

    res.json({
      data: transfers,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helpers
const getModel = (loc) => (loc === 'warehouse' ? Warehouse : loc === 'store' ? Store : Store2);
const getQtyField = (loc) => (loc === 'warehouse' ? 'quantity' : 'remaining_quantity');

export const createTransfer = async (req, res) => {
  try {
    const { error } = transferSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { items, from, to, technician, workType } = req.body;
    if (from === to) return res.status(400).json({ error: 'Source and destination must be different' });

    // Check stock and update for each item
    for (const { item, quantity } of items) {
      const FromModel = getModel(from);
      const ToModel = getModel(to);
  let fromDoc = await FromModel.findOne({ item });
  let toDoc = await ToModel.findOne({ item });
  const fromQty = fromDoc ? (from === 'warehouse' ? fromDoc.quantity : fromDoc.remaining_quantity) : 0;
  if (!fromDoc || fromQty < quantity) {
        return res.status(400).json({ error: `Not enough stock in ${from}` });
      }
      // Deduct from source
      if (from === 'warehouse') {
        fromDoc.quantity -= quantity;
      } else {
        fromDoc.remaining_quantity -= quantity;
      }
      await fromDoc.save();
      // Add to destination
      if (toDoc) {
        if (to === 'warehouse') {
          toDoc.quantity += quantity;
        } else {
          toDoc.remaining_quantity += quantity;
        }
        await toDoc.save();
      } else {
        if (to === 'warehouse') {
          await Warehouse.create({ item, quantity });
        } else if (to === 'store') {
          await Store.create({ item, remaining_quantity: quantity });
        } else if (to === 'store2') {
          await Store2.create({ item, remaining_quantity: quantity });
        }
      }
    }
    const transfer = new Transfer({ items, from, to, technician, workType });
    await transfer.save();
    res.status(201).json(transfer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update transfer
export const updateTransfer = async (req, res) => {
  try {
    const { error } = transferSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { items, from, to, technician, workType } = req.body;
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
    // 1) Revert previous inventory effects
    for (const prev of transfer.items) {
      const FromModelPrev = getModel(transfer.from);
      const ToModelPrev = getModel(transfer.to);
      const fromFieldPrev = getQtyField(transfer.from);
      const toFieldPrev = getQtyField(transfer.to);

      let fromDocPrev = await FromModelPrev.findOne({ item: prev.item });
      let toDocPrev = await ToModelPrev.findOne({ item: prev.item });

      // Add back to source
      if (fromDocPrev) {
        fromDocPrev[fromFieldPrev] = (fromDocPrev[fromFieldPrev] || 0) + prev.quantity;
        await fromDocPrev.save();
      } else {
        // If missing, create with reverted qty
        const payload = { item: prev.item };
        payload[fromFieldPrev] = prev.quantity;
        await getModel(transfer.from).create(payload);
      }
      // Subtract from destination
      if (toDocPrev) {
        toDocPrev[toFieldPrev] = Math.max(0, (toDocPrev[toFieldPrev] || 0) - prev.quantity);
        await toDocPrev.save();
      }
    }

    // 2) Apply new transfer (same as create)
    for (const { item, quantity } of items) {
      const FromModel = getModel(from);
      const ToModel = getModel(to);
      let fromDoc = await FromModel.findOne({ item });
      let toDoc = await ToModel.findOne({ item });
      const fromQty = fromDoc ? (from === 'warehouse' ? fromDoc.quantity : fromDoc.remaining_quantity) : 0;
      if (!fromDoc || fromQty < quantity) {
        return res.status(400).json({ error: `Not enough stock in ${from}` });
      }
      if (from === 'warehouse') {
        fromDoc.quantity -= quantity;
      } else {
        fromDoc.remaining_quantity -= quantity;
      }
      await fromDoc.save();
      if (toDoc) {
        if (to === 'warehouse') {
          toDoc.quantity += quantity;
        } else {
          toDoc.remaining_quantity += quantity;
        }
        await toDoc.save();
      } else {
        if (to === 'warehouse') {
          await Warehouse.create({ item, quantity });
        } else if (to === 'store') {
          await Store.create({ item, remaining_quantity: quantity });
        } else if (to === 'store2') {
          await Store2.create({ item, remaining_quantity: quantity });
        }
      }
    }

    // 3) Save updated transfer
    transfer.items = items;
    transfer.from = from;
    transfer.to = to;
    transfer.technician = technician;
    transfer.workType = workType;
    await transfer.save();
    res.json(transfer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete transfer
export const deleteTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
    await Transfer.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

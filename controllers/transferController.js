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
    const transfers = await Transfer.find().populate('items.item').populate('technician');
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createTransfer = async (req, res) => {
  try {
    const { error } = transferSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { items, from, to, technician, workType } = req.body;
    if (from === to) return res.status(400).json({ error: 'Source and destination must be different' });

    // Helper to get model by location
    const getModel = loc => loc === 'warehouse' ? Warehouse : loc === 'store' ? Store : Store2;

    // Check stock and update for each item
    for (const { item, quantity } of items) {
      const FromModel = getModel(from);
      const ToModel = getModel(to);
      let fromDoc = await FromModel.findOne({ item });
      let toDoc = await ToModel.findOne({ item });
      if (!fromDoc || (fromDoc.quantity ?? fromDoc.remaining_quantity) < quantity) {
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
    // NOTE: For simplicity, this does not revert previous inventory changes. For full accuracy, revert old transfer first.
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
    const transfer = await Transfer.findByIdAndDelete(req.params.id);
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

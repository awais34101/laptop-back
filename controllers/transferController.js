import Transfer from '../models/Transfer.js';
import Warehouse from '../models/Warehouse.js';
import Store from '../models/Store.js';
import Joi from 'joi';

const transferSchema = Joi.object({
  item: Joi.string().required(),
  quantity: Joi.number().min(1).required(),
  direction: Joi.string().valid('store-to-warehouse', 'warehouse-to-store').required(),
  technician: Joi.string().optional().allow(null, ''),
  workType: Joi.string().valid('repair', 'test').optional().allow(null, ''),
});

export const getTransfers = async (req, res) => {
  try {
    const transfers = await Transfer.find().populate('item').populate('technician');
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createTransfer = async (req, res) => {
  try {
    const { error } = transferSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { item, quantity, direction, technician, workType } = req.body;
    let warehouse = await Warehouse.findOne({ item });
    let store = await Store.findOne({ item });
    if (direction === 'warehouse-to-store') {
      if (!warehouse || warehouse.quantity < quantity) {
        return res.status(400).json({ error: 'Not enough stock in warehouse' });
      }
      warehouse.quantity -= quantity;
      await warehouse.save();
      if (store) {
        store.remaining_quantity += quantity;
        await store.save();
      } else {
        await Store.create({ item, remaining_quantity: quantity });
      }
    } else if (direction === 'store-to-warehouse') {
      if (!store || store.remaining_quantity < quantity) {
        return res.status(400).json({ error: 'Not enough stock in store' });
      }
      store.remaining_quantity -= quantity;
      await store.save();
      if (warehouse) {
        warehouse.quantity += quantity;
        await warehouse.save();
      } else {
        await Warehouse.create({ item, quantity });
      }
    } else {
      return res.status(400).json({ error: 'Invalid transfer direction' });
    }
    const transfer = new Transfer({ item, quantity, direction, technician, workType });
    await transfer.save();
    res.status(201).json(transfer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

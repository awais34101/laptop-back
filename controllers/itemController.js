
import Item from '../models/Item.js';
import Joi from 'joi';
import { Warehouse, Store, Store2 } from '../models/inventoryModels.js';

const itemSchema = Joi.object({
  name: Joi.string().required(),
  unit: Joi.string().required(),
  category: Joi.string().required(),
  average_price: Joi.number().min(0),
});

export const getItems = async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createItem = async (req, res) => {
  try {
    const { error } = itemSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const exists = await Item.findOne({ name: req.body.name });
    if (exists) return res.status(400).json({ error: 'Item name must be unique' });
    const item = new Item(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { error } = itemSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const deleteItem = async (req, res) => {
  try {
    const itemId = req.params.id;
    // Check Warehouse
    const warehouse = await Warehouse.findOne({ item: itemId });
    if (warehouse && warehouse.quantity > 0) {
      return res.status(400).json({ error: 'Cannot delete item: Active inventory exists in Warehouse.' });
    }
    // Check Store
    const store = await Store.findOne({ item: itemId });
    if (store && store.remaining_quantity > 0) {
      return res.status(400).json({ error: 'Cannot delete item: Active inventory exists in Store.' });
    }
    // Check Store2
    const store2 = await Store2.findOne({ item: itemId });
    if (store2 && store2.remaining_quantity > 0) {
      return res.status(400).json({ error: 'Cannot delete item: Active inventory exists in Store2.' });
    }
    // If no active inventory, delete item
    const item = await Item.findByIdAndDelete(itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

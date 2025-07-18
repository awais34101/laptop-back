import Store from '../models/Store.js';
import Item from '../models/Item.js';

export const getStoreInventory = async (req, res) => {
  try {
    const inventory = await Store.find().populate('item');
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

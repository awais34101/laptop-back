import Store2 from '../models/Store2.js';
import Item from '../models/Item.js';

export const getStore2Inventory = async (req, res) => {
  try {
    const inventory = await Store2.find().populate('item');
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Store2 inventory' });
  }
};

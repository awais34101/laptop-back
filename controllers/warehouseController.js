import Warehouse from '../models/Warehouse.js';
import Item from '../models/Item.js';

export const getWarehouseStock = async (req, res) => {
  try {
    const stock = await Warehouse.find().populate('item');
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

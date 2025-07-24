// Get only available items in warehouse (quantity > 0)
export const getAvailableWarehouseItems = async (req, res) => {
  try {
    const stock = await Warehouse.find({ quantity: { $gt: 0 } }).populate('item');
    // Format as array of { _id, name, quantity, ... }
    const items = stock.map(entry => {
      if (!entry.item) return null;
      return {
        _id: entry.item._id,
        name: entry.item.name,
        unit: entry.item.unit,
        category: entry.item.category,
        average_price: entry.item.average_price,
        last_sale_date: entry.item.last_sale_date,
        sale_count: entry.item.sale_count,
        quantity: entry.quantity
      };
    }).filter(Boolean);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
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

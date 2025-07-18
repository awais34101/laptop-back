import Item from '../models/Item.js';
import Warehouse from '../models/Warehouse.js';
import Store from '../models/Store.js';
import Settings from '../models/Settings.js';

export const getSlowMoving = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    const threshold = settings?.slow_moving_days || 30;
    const cutoff = new Date(Date.now() - threshold * 24 * 60 * 60 * 1000);
    const items = await Item.find({ last_sale_date: { $lt: cutoff } });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getLowStock = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    const threshold = settings?.low_stock_days || 7;
    // Find items with low stock in warehouse or store
    const warehouse = await Warehouse.find().populate('item');
    const store = await Store.find().populate('item');
    const lowWarehouse = warehouse.filter(w => w.quantity <= threshold);
    const lowStore = store.filter(s => s.remaining_quantity <= threshold);
    res.json({ warehouse: lowWarehouse, store: lowStore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

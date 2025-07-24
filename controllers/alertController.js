import Item from '../models/Item.js';
import Warehouse from '../models/Warehouse.js';
import Store from '../models/Store.js';
import Store2 from '../models/Store2.js';
import Settings from '../models/Settings.js';

export const getSlowMoving = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    const threshold = settings?.slow_moving_days || 30;
    const cutoff = new Date(Date.now() - threshold * 24 * 60 * 60 * 1000);
    // Slow moving items in Store
    const store = await Store.find().populate('item');
    const slowStore = store.filter(s => s.item && s.item.last_sale_date && new Date(s.item.last_sale_date) < cutoff);
    // Slow moving items in Store2
    const store2 = await Store2.find().populate('item');
    const slowStore2 = store2.filter(s => s.item && s.item.last_sale_date && new Date(s.item.last_sale_date) < cutoff);
    res.json({ store: slowStore, store2: slowStore2 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getLowStock = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    const threshold = settings?.low_stock_days || 7;
    // Find items with low stock in warehouse, store, and store2
    const warehouse = await Warehouse.find().populate('item');
    const store = await Store.find().populate('item');
    const store2 = await Store2.find().populate('item');
    const lowWarehouse = warehouse.filter(w => w.quantity <= threshold);
    const lowStore = store.filter(s => s.remaining_quantity <= threshold);
    const lowStore2 = store2.filter(s => s.remaining_quantity <= threshold);
    res.json({ warehouse: lowWarehouse, store: lowStore, store2: lowStore2 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

import SaleStore2 from '../models/SaleStore2.js';
import Store2 from '../models/Store2.js';
import Item from '../models/Item.js';
import Customer from '../models/Customer.js';
import Joi from 'joi';

const saleItemSchema = Joi.object({
  item: Joi.string().required(),
  quantity: Joi.number().min(1).required(),
  price: Joi.number().min(0).required(),
});

const saleSchema = Joi.object({
  items: Joi.array().items(saleItemSchema).min(1).required(),
  customer: Joi.string().required(),
  invoice_number: Joi.string().allow(''),
});

export const getSalesStore2 = async (req, res) => {
  try {
    const { from, to } = req.query;
    let filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const sales = await SaleStore2.find(filter).populate('items.item').populate('customer');
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createSaleStore2 = async (req, res) => {
  try {
    const { error } = saleSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const sale = new SaleStore2(req.body);
    await sale.save();
    // Update Store2 inventory and per-store sale stats
    for (const i of req.body.items) {
      const store2 = await Store2.findOne({ item: i.item });
      if (store2) {
        store2.remaining_quantity -= i.quantity;
        store2.last_sale_date = new Date();
        store2.sale_count = (store2.sale_count || 0) + i.quantity;
        await store2.save();
      }
    }
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteSaleStore2 = async (req, res) => {
  try {
    const sale = await SaleStore2.findByIdAndDelete(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    // Optionally, restore Store2 inventory here if needed
    res.json({ message: 'Sale deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

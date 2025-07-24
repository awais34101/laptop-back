// Delete a sale invoice
export const deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findByIdAndDelete(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    // Optionally, update store stock here if needed
    res.json({ message: 'Sale deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

import Sale from '../models/Sale.js';
import Store from '../models/Store.js';
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


export const getSales = async (req, res) => {
  try {
    const { from, to } = req.query;
    let filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const sales = await Sale.find(filter).populate('items.item').populate('customer');
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const createSale = async (req, res) => {
  try {
    const { error } = saleSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { items, customer, invoice_number } = req.body;

    // Check stock for all items
    for (const saleItem of items) {
      const store = await Store.findOne({ item: saleItem.item });
      if (!store || store.remaining_quantity < saleItem.quantity) {
        return res.status(400).json({ error: `Not enough stock in store for item` });
      }
    }

    // Deduct stock and update per-store sale stats
    for (const saleItem of items) {
      const store = await Store.findOne({ item: saleItem.item });
      store.remaining_quantity -= saleItem.quantity;
      // Update per-store last_sale_date and sale_count
      store.last_sale_date = new Date();
      store.sale_count = (store.sale_count || 0) + saleItem.quantity;
      await store.save();
    }

    const sale = new Sale({ items, customer, invoice_number });
    await sale.save();
    res.status(201).json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

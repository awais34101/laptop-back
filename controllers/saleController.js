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

import mongoose from 'mongoose';
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
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;
    let filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.date.$lte = toDate;
      }
    }
    const [total, sales] = await Promise.all([
      Sale.countDocuments(filter),
      Sale.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.item')
        .populate('customer')
    ]);
    res.json({ data: sales, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get total sales amount (sum of quantity*price) with optional date filter
export const getSalesTotal = async (req, res) => {
  try {
    const { from, to } = req.query;
    const match = {};
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        match.date.$lte = toDate;
      }
    }
    const pipeline = [
      Object.keys(match).length ? { $match: match } : null,
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
        },
      },
      { $project: { _id: 0, total: 1 } },
    ].filter(Boolean);
    const result = await Sale.aggregate(pipeline);
    const total = result[0]?.total || 0;
    res.json({ total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const createSale = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { error } = saleSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { items, customer, invoice_number } = req.body;
    let createdSale;
    await session.withTransaction(async () => {
      // 0) Verify customer exists
      const customerDoc = await Customer.findById(customer).session(session);
      if (!customerDoc) {
        throw new Error('Customer not found');
      }
      
      // 1) Check stock and update inventory in single loop (optimization)
      for (const saleItem of items) {
        const store = await Store.findOne({ item: saleItem.item }).session(session);
        if (!store || store.remaining_quantity < saleItem.quantity) {
          throw new Error('Not enough stock in store for item');
        }
        
        // Immediately update stock after validation
        store.remaining_quantity -= saleItem.quantity;
        store.last_sale_date = new Date();
        store.sale_count = (store.sale_count || 0) + saleItem.quantity;
        await store.save({ session });

        // Update global Item sale stats
        const itemDoc = await Item.findById(saleItem.item).session(session);
        if (itemDoc) {
          itemDoc.last_sale_date = new Date();
          itemDoc.sale_count = (itemDoc.sale_count || 0) + saleItem.quantity;
          await itemDoc.save({ session });
        }
      }
      
      // 2) Save sale
      createdSale = new Sale({ items, customer, invoice_number });
      await createdSale.save({ session });
    });
    res.status(201).json(createdSale);
  } catch (err) {
    if (String(err.message || '').includes('Not enough stock') || String(err.message || '').includes('Customer not found')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
};

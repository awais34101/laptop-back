import mongoose from 'mongoose';
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
      SaleStore2.countDocuments(filter),
      SaleStore2.find(filter)
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

export const getSalesStore2Total = async (req, res) => {
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
    const result = await SaleStore2.aggregate(pipeline);
    const total = result[0]?.total || 0;
    res.json({ total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createSaleStore2 = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { error } = saleSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    let created;
    await session.withTransaction(async () => {
      // Verify customer exists
      const customerDoc = await Customer.findById(req.body.customer).session(session);
      if (!customerDoc) {
        throw new Error('Customer not found');
      }
      
      // Save sale first
      created = new SaleStore2(req.body);
      await created.save({ session });
      
      // Check stock and update in single loop (optimization)
      for (const i of req.body.items) {
        const store2 = await Store2.findOne({ item: i.item }).session(session);
        if (!store2 || store2.remaining_quantity < i.quantity) {
          throw new Error('Not enough stock in store2 for item');
        }
        
        // Immediately update after validation
        store2.remaining_quantity -= i.quantity;
        store2.last_sale_date = new Date();
        store2.sale_count = (store2.sale_count || 0) + i.quantity;
        await store2.save({ session });

        // Update global Item sale stats
        const itemDoc = await Item.findById(i.item).session(session);
        if (itemDoc) {
          itemDoc.last_sale_date = new Date();
          itemDoc.sale_count = (itemDoc.sale_count || 0) + i.quantity;
          await itemDoc.save({ session });
        }
      }
    });
    res.json(created);
  } catch (err) {
    if (String(err.message || '').includes('Not enough stock') || String(err.message || '').includes('Customer not found')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
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

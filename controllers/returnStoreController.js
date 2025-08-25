import mongoose from 'mongoose';
import ReturnStore from '../models/ReturnStore.js';
import Item from '../models/Item.js';
import Store from '../models/Store.js';
import Store2 from '../models/Store2.js';
import Warehouse from '../models/Warehouse.js';
import Joi from 'joi';

const returnItemSchema = Joi.object({
  item: Joi.string().required(),
  quantity: Joi.number().min(1).required(),
  price: Joi.number().min(0).required(),
});

const returnSchema = Joi.object({
  items: Joi.array().items(returnItemSchema).min(1).required(),
  customer: Joi.string().required(),
  invoice_number: Joi.string().required(),
});

export const getReturnsStore = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const [total, returns] = await Promise.all([
      ReturnStore.countDocuments(),
      ReturnStore.find()
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.item')
    ]);
    res.json({
      data: returns,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createReturnStore = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { error } = returnSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { items, customer, invoice_number } = req.body;
    const dup = await ReturnStore.exists({ customer, invoice_number });
    if (dup) return res.status(409).json({ error: 'Duplicate invoice: this customer already has an invoice with the same number.' });
    let createdReturn;
    await session.withTransaction(async () => {
      for (const { item, quantity, price } of items) {
        const itemDoc = await Item.findById(item).session(session);
        if (!itemDoc) throw new Error(`Item not found: ${item}`);
        // Get inventory across Warehouse, Store, Store2
        const [whDoc, storeDoc, store2Doc] = await Promise.all([
          Warehouse.findOne({ item }).session(session),
          Store.findOne({ item }).session(session),
          Store2.findOne({ item }).session(session)
        ]);
        const currentTotalQty = (whDoc?.quantity || 0) + (storeDoc?.remaining_quantity || 0) + (store2Doc?.remaining_quantity || 0);
        const currentAvg = itemDoc.average_price || 0;
        const denominator = currentTotalQty + quantity;
        const newAvg = denominator > 0 ? ((currentTotalQty * currentAvg) + (quantity * price)) / denominator : price;
        itemDoc.average_price = newAvg;
        await itemDoc.save({ session });
        if (storeDoc) {
          storeDoc.remaining_quantity += quantity;
          await storeDoc.save({ session });
        } else {
          await Store.create([{ item, remaining_quantity: quantity }], { session });
        }
      }
      createdReturn = new ReturnStore({ items, customer, invoice_number });
      await createdReturn.save({ session });
    });
    res.status(201).json(createdReturn);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate invoice: this customer already has an invoice with the same number.' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
};

export const deleteReturnStore = async (req, res) => {
  try {
    const doc = await ReturnStore.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Return invoice not found' });
    res.json({ message: 'Return invoice deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

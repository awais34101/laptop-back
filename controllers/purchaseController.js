// Delete a purchase invoice
export const deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findByIdAndDelete(req.params.id);
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
    // Optionally, you can also update warehouse stock here if needed
    res.json({ message: 'Purchase deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
export const updatePurchase = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { error } = purchaseSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { items, supplier, invoice_number } = req.body;
    const purchase = await Purchase.findById(req.params.id).session(session);
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
  // Prevent duplicate invoice for same supplier (excluding current doc)
  const dup = await Purchase.exists({ supplier, invoice_number, _id: { $ne: purchase._id } });
  if (dup) return res.status(409).json({ error: 'Duplicate invoice: this supplier already has an invoice with the same number.' });

    await session.withTransaction(async () => {
      // 1. Reverse previous warehouse stock for each item in the old purchase
      for (const prev of purchase.items) {
        const warehouse = await Warehouse.findOne({ item: prev.item }).session(session);
        if (warehouse) {
          warehouse.quantity -= prev.quantity;
          if (warehouse.quantity < 0) warehouse.quantity = 0;
          await warehouse.save({ session });
        }
      }

      // 2. Update warehouse stock for new items
      for (const { item, quantity, price } of items) {
        const itemDoc = await Item.findById(item).session(session);
        if (!itemDoc) throw new Error(`Item not found: ${item}`);
        // Compute current on-hand across Warehouse, Store, Store2 BEFORE adding new qty
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

        // Then add new qty to Warehouse
        if (whDoc) {
          whDoc.quantity += quantity;
          await whDoc.save({ session });
        } else {
          await Warehouse.create([{ item, quantity }], { session });
        }
      }

      purchase.items = items;
      purchase.supplier = supplier;
      purchase.invoice_number = invoice_number;
      await purchase.save({ session });
      res.json(purchase);
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate invoice: this supplier already has an invoice with the same number.' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
};
import mongoose from 'mongoose';
import Purchase from '../models/Purchase.js';
import Item from '../models/Item.js';
import Warehouse from '../models/Warehouse.js';
import Store from '../models/Store.js';
import Store2 from '../models/Store2.js';
import Joi from 'joi';


const purchaseItemSchema = Joi.object({
  item: Joi.string().required(),
  quantity: Joi.number().min(1).required(),
  price: Joi.number().min(0).required(),
});

const purchaseSchema = Joi.object({
  items: Joi.array().items(purchaseItemSchema).min(1).required(),
  supplier: Joi.string().required(),
  invoice_number: Joi.string().required(),
});

export const getPurchases = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const [total, purchases] = await Promise.all([
      Purchase.countDocuments(),
      Purchase.find()
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.item')
    ]);

    res.json({
      data: purchases,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createPurchase = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { error } = purchaseSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { items, supplier, invoice_number } = req.body;
  // Prevent duplicate invoice for same supplier
  const dup = await Purchase.exists({ supplier, invoice_number });
  if (dup) return res.status(409).json({ error: 'Duplicate invoice: this supplier already has an invoice with the same number.' });

    let createdPurchase;
    await session.withTransaction(async () => {
      // Process each item in the purchase
      for (const { item, quantity, price } of items) {
        const itemDoc = await Item.findById(item).session(session);
        if (!itemDoc) throw new Error(`Item not found: ${item}`);
        // Compute total on-hand across Warehouse + Store + Store2 BEFORE adding new qty
        const [whDoc, storeDoc, store2Doc] = await Promise.all([
          Warehouse.findOne({ item }).session(session),
          Store.findOne({ item }).session(session),
          Store2.findOne({ item }).session(session)
        ]);

        const currentTotalQty = (whDoc?.quantity || 0) + (storeDoc?.remaining_quantity || 0) + (store2Doc?.remaining_quantity || 0);
        const currentAvg = itemDoc.average_price || 0;

        // Weighted average cost
        const denominator = currentTotalQty + quantity;
        const newAvg = denominator > 0 ? ((currentTotalQty * currentAvg) + (quantity * price)) / denominator : price;

        // Persist new average first
        itemDoc.average_price = newAvg;
        await itemDoc.save({ session });

        // Then update/add to Warehouse quantity
        if (whDoc) {
          whDoc.quantity += quantity;
          await whDoc.save({ session });
        } else {
          await Warehouse.create([{ item, quantity }], { session });
        }
      }
      // Save the purchase document
      createdPurchase = new Purchase({ items, supplier, invoice_number });
      await createdPurchase.save({ session });
    });

    res.status(201).json(createdPurchase);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate invoice: this supplier already has an invoice with the same number.' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
};

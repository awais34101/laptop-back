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
  try {
    const { error } = purchaseSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { items, supplier, invoice_number } = req.body;
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

    // 1. Reverse previous warehouse stock for each item in the old purchase
    for (const prev of purchase.items) {
      const warehouse = await Warehouse.findOne({ item: prev.item });
      if (warehouse) {
        warehouse.quantity -= prev.quantity;
        if (warehouse.quantity < 0) warehouse.quantity = 0;
        await warehouse.save();
      }
    }

    // 2. Update warehouse stock for new items
    for (const { item, quantity, price } of items) {
      const itemDoc = await Item.findById(item);
      if (!itemDoc) return res.status(404).json({ error: `Item not found: ${item}` });
      const warehouse = await Warehouse.findOne({ item });
      let old_qty = 0, old_price = 0;
      if (warehouse) {
        old_qty = warehouse.quantity;
        old_price = itemDoc.average_price;
        warehouse.quantity += quantity;
        await warehouse.save();
      } else {
        await Warehouse.create({ item, quantity });
      }
      // Update average price (simple logic, not perfect for edits)
      const new_avg = (old_qty * old_price + quantity * price) / (old_qty + quantity || 1);
      itemDoc.average_price = new_avg;
      await itemDoc.save();
    }

    purchase.items = items;
    purchase.supplier = supplier;
    purchase.invoice_number = invoice_number;
    await purchase.save();
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
import Purchase from '../models/Purchase.js';
import Item from '../models/Item.js';
import Warehouse from '../models/Warehouse.js';
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
    const purchases = await Purchase.find().populate('items.item');
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createPurchase = async (req, res) => {
  try {
    const { error } = purchaseSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { items, supplier, invoice_number } = req.body;
    // Process each item in the purchase
    for (const { item, quantity, price } of items) {
      const itemDoc = await Item.findById(item);
      if (!itemDoc) return res.status(404).json({ error: `Item not found: ${item}` });
      // Update average price
      const warehouse = await Warehouse.findOne({ item });
      let old_qty = 0, old_price = 0;
      if (warehouse) {
        old_qty = warehouse.quantity;
        old_price = itemDoc.average_price;
        warehouse.quantity += quantity;
        await warehouse.save();
      } else {
        await Warehouse.create({ item, quantity });
      }
      const new_avg = (old_qty * old_price + quantity * price) / (old_qty + quantity);
      itemDoc.average_price = new_avg;
      await itemDoc.save();
    }
    // Save the purchase document
    const purchase = new Purchase({ items, supplier, invoice_number });
    await purchase.save();
    res.status(201).json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

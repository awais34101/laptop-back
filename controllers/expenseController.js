import mongoose from 'mongoose';
import Joi from 'joi';
import ExpenseStore from '../models/ExpenseStore.js';
import ExpenseStore2 from '../models/ExpenseStore2.js';

const expenseItemSchema = Joi.object({
  description: Joi.string().required(),
  category: Joi.string().allow(''),
  amount: Joi.number().min(0).required(),
});

const expenseSchema = Joi.object({
  items: Joi.array().items(expenseItemSchema).min(1).required(),
  note: Joi.string().allow(''),
  date: Joi.date().optional(),
});

const getModel = (storeId) => (storeId === 'store2' ? ExpenseStore2 : ExpenseStore);

export const listExpenses = async (req, res) => {
  try {
    const { from, to, page = 1, limit = 20, store = 'store' } = req.query;
    const Model = getModel(store);
    const p = Math.max(parseInt(page) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const skip = (p - 1) * l;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const [total, docs] = await Promise.all([
      Model.countDocuments(filter),
      Model.find(filter).sort({ date: -1 }).skip(skip).limit(l).lean()
    ]);
    res.json({ data: docs, total, page: p, pageSize: l, totalPages: Math.ceil(total / l) || 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createExpense = async (req, res) => {
  try {
    const { store = 'store' } = req.query;
    const { error } = expenseSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const Model = getModel(store);
    const created = await Model.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const { store = 'store' } = req.query;
    const { error } = expenseSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const Model = getModel(store);
    const updated = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Expense not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const { store = 'store' } = req.query;
    const Model = getModel(store);
    const deleted = await Model.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

import Joi from 'joi';
import Document from '../models/Document.js';

const createSchema = Joi.object({
  name: Joi.string().required(),
  category: Joi.string().required(),
  number: Joi.string().allow(''),
  issueDate: Joi.date().allow(null),
  expiryDate: Joi.date().allow(null),
  note: Joi.string().allow(''),
  attachments: Joi.array().items(Joi.string()).default([]),
});

export const listDocuments = async (req, res) => {
  try {
    const { q = '', category = '', page = 1, limit = 20, expiringInDays } = req.query;
    const p = Math.max(parseInt(page) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const skip = (p - 1) * l;

    const filter = {};
    if (category) filter.category = category;

    if (typeof expiringInDays !== 'undefined') {
      const days = Math.max(parseInt(expiringInDays) || 0, 0);
      const now = new Date();
      const until = new Date(now.getTime() + days * 86400000);
      filter.expiryDate = { $ne: null, $lte: until };
    }

    if (q) {
      filter.$text = { $search: q };
    }

    // Expiry-first ordering: non-null expiry dates come first (soonest first), then no-expiry at the end
    const [total, docs] = await Promise.all([
      Document.countDocuments(filter),
      Document.aggregate([
        { $match: filter },
        { $addFields: { expiryDateNull: { $cond: [{ $eq: ['$expiryDate', null] }, 1, 0] } } },
        { $sort: { expiryDateNull: 1, expiryDate: 1, createdAt: -1 } },
        { $skip: skip },
        { $limit: l },
        { $project: { expiryDateNull: 0 } }
      ])
    ]);

    res.json({ data: docs, total, page: p, pageSize: l, totalPages: Math.ceil(total / l) || 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createDocument = async (req, res) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const created = await Document.create({ ...value, createdBy: req.user?.userId });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateDocument = async (req, res) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const updated = await Document.findByIdAndUpdate(req.params.id, { ...value, updatedBy: req.user?.userId }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const listCategories = async (req, res) => {
  try {
    const categories = await Document.distinct('category');
    categories.sort((a, b) => String(a).localeCompare(String(b)));
    res.json({ data: categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

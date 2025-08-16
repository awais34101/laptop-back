import express from 'express';
import { listExpenses, createExpense, updateExpense, deleteExpense } from '../controllers/expenseController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

// store param via query: ?store=store or ?store=store2
router.get('/', auth, requirePermission('expenses', 'view'), listExpenses);
router.post('/', auth, requirePermission('expenses', 'edit'), createExpense);
router.put('/:id', auth, requirePermission('expenses', 'edit'), updateExpense);
router.delete('/:id', auth, requirePermission('expenses', 'delete'), deleteExpense);

export default router;

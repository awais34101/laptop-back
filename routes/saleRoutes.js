import express from 'express';
import { getSales, getSalesTotal, createSale, deleteSale } from '../controllers/saleController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();


router.get('/', auth, requirePermission('sales', 'view'), getSales);
router.get('/total', auth, requirePermission('sales', 'view'), getSalesTotal);
router.post('/', auth, requirePermission('sales', 'edit'), createSale);
router.delete('/:id', auth, requirePermission('sales', 'delete'), deleteSale);

export default router;

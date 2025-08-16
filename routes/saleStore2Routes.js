import express from 'express';
import { getSalesStore2, getSalesStore2Total, createSaleStore2, deleteSaleStore2 } from '../controllers/saleStore2Controller.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requirePermission('sales', 'view'), getSalesStore2);
router.get('/total', auth, requirePermission('sales', 'view'), getSalesStore2Total);
router.post('/', auth, requirePermission('sales', 'edit'), createSaleStore2);
router.delete('/:id', auth, requirePermission('sales', 'delete'), deleteSaleStore2);

export default router;

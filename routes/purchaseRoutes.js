import express from 'express';
import { getPurchases, createPurchase, updatePurchase, deletePurchase } from '../controllers/purchaseController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();



router.get('/', auth, requirePermission('purchases', 'view'), getPurchases);
router.post('/', auth, requirePermission('purchases', 'edit'), createPurchase);
router.put('/:id', auth, requirePermission('purchases', 'edit'), updatePurchase);
router.delete('/:id', auth, requirePermission('purchases', 'delete'), deletePurchase);

export default router;

import express from 'express';
import auth, { requirePermission } from '../middleware/auth.js';
import { listPartsPurchases, createPartsPurchase, deletePartsPurchase } from '../controllers/partsPurchaseController.js';

const router = express.Router();

router.get('/', auth, requirePermission('partsInventory','view'), listPartsPurchases);
// Allow creating parts purchases with 'view' permission so staff can record buys without edit rights
router.post('/', auth, requirePermission('partsInventory','view'), createPartsPurchase);
router.delete('/:id', auth, requirePermission('partsInventory','delete'), deletePartsPurchase);

export default router;

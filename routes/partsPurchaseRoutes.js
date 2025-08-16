import express from 'express';
import auth, { requirePermission } from '../middleware/auth.js';
import { listPartsPurchases, createPartsPurchase } from '../controllers/partsPurchaseController.js';

const router = express.Router();

router.get('/', auth, requirePermission('partsInventory','view'), listPartsPurchases);
router.post('/', auth, requirePermission('partsInventory','edit'), createPartsPurchase);

export default router;

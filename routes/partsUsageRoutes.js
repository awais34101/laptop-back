import express from 'express';
import auth, { requirePermission } from '../middleware/auth.js';
import { useParts, listPartsUsage, deletePartsUsage } from '../controllers/partsUsageController.js';

const router = express.Router();

// Allow using parts with 'view' permission so staff can record usage
router.post('/', auth, requirePermission('partsInventory','view'), useParts);
router.get('/', auth, requirePermission('partsInventory','view'), listPartsUsage);
router.delete('/:id', auth, requirePermission('partsInventory','delete'), deletePartsUsage);

export default router;

import express from 'express';
import auth, { requirePermission } from '../middleware/auth.js';
import { useParts, listPartsUsage, deletePartsUsage } from '../controllers/partsUsageController.js';

const router = express.Router();

router.post('/', auth, requirePermission('partsInventory','edit'), useParts);
router.get('/', auth, requirePermission('partsInventory','view'), listPartsUsage);
router.delete('/:id', auth, requirePermission('partsInventory','delete'), deletePartsUsage);

export default router;

import express from 'express';
import auth, { requirePermission } from '../middleware/auth.js';
import { listParts, createPart, updatePart, deletePart, getPartsInventory, transferParts, listPartsTransfers } from '../controllers/partsInventoryController.js';

const router = express.Router();

// Parts master
router.get('/parts', auth, requirePermission('partsInventory','view'), listParts);
router.post('/parts', auth, requirePermission('partsInventory','edit'), createPart);
router.put('/parts/:id', auth, requirePermission('partsInventory','edit'), updatePart);
router.delete('/parts/:id', auth, requirePermission('partsInventory','delete'), deletePart);

// Inventory snapshot
router.get('/inventory', auth, requirePermission('partsInventory','view'), getPartsInventory);

// Transfers
router.post('/transfers', auth, requirePermission('partsInventory','edit'), transferParts);
router.get('/transfers', auth, requirePermission('partsInventory','view'), listPartsTransfers);

export default router;

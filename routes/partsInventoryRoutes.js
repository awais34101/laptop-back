import express from 'express';
import auth, { requirePermission } from '../middleware/auth.js';
import { listParts, createPart, updatePart, deletePart, getPartsInventory, transferParts, listPartsTransfers } from '../controllers/partsInventoryController.js';

const router = express.Router();

// Parts master
router.get('/parts', auth, requirePermission('partsInventory','view'), listParts);
// Allow creating parts with 'view' permission so staff can add master data
router.post('/parts', auth, requirePermission('partsInventory','view'), createPart);
router.put('/parts/:id', auth, requirePermission('partsInventory','edit'), updatePart);
router.delete('/parts/:id', auth, requirePermission('partsInventory','delete'), deletePart);

// Inventory snapshot
router.get('/inventory', auth, requirePermission('partsInventory','view'), getPartsInventory);

// Transfers
// Allow transferring parts with 'view' permission so staff can move stock between locations
router.post('/transfers', auth, requirePermission('partsInventory','view'), transferParts);
router.get('/transfers', auth, requirePermission('partsInventory','view'), listPartsTransfers);

export default router;

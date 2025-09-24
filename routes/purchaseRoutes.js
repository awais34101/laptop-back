import express from 'express';
import { getPurchases, createPurchase, updatePurchase, deletePurchase, getPurchaseSheets, assignSheet, updateSheetStatus, getTechnicians, createSheetTransfer, getSheetProgress } from '../controllers/purchaseController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();



router.get('/', auth, requirePermission('purchases', 'view'), getPurchases);
router.get('/sheets', auth, requirePermission('purchaseSheets', 'view'), getPurchaseSheets);
router.get('/:purchaseId/progress', auth, requirePermission('purchaseSheets', 'view'), getSheetProgress);
router.get('/technicians', auth, requirePermission('technicians', 'view'), getTechnicians);
router.post('/', auth, requirePermission('purchases', 'edit'), createPurchase);
router.post('/:purchaseId/assign', auth, requirePermission('purchases', 'edit'), assignSheet);
router.post('/:purchaseId/transfers', auth, requirePermission('transfers', 'add'), createSheetTransfer);
router.put('/:id', auth, requirePermission('purchases', 'edit'), updatePurchase);
router.put('/assignments/:assignmentId/status', auth, requirePermission('purchases', 'edit'), updateSheetStatus);
router.delete('/:id', auth, requirePermission('purchases', 'delete'), deletePurchase);

export default router;

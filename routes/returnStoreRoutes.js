import express from 'express';
import { getReturnsStore, createReturnStore, deleteReturnStore } from '../controllers/returnStoreController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requirePermission('purchases', 'view'), getReturnsStore);
router.post('/', auth, requirePermission('purchases', 'edit'), createReturnStore);
router.delete('/:id', auth, requirePermission('purchases', 'delete'), deleteReturnStore);

export default router;

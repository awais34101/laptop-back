import express from 'express';
import { getReturnsStore, createReturnStore, deleteReturnStore } from '../controllers/returnStoreController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requirePermission('returnsStore', 'view'), getReturnsStore);
router.post('/', auth, requirePermission('returnsStore', 'add'), createReturnStore);
router.delete('/:id', auth, requirePermission('returnsStore', 'delete'), deleteReturnStore);

export default router;

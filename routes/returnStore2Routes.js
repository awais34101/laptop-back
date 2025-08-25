import express from 'express';
import { getReturnsStore2, createReturnStore2, deleteReturnStore2 } from '../controllers/returnStore2Controller.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requirePermission('purchases', 'view'), getReturnsStore2);
router.post('/', auth, requirePermission('purchases', 'edit'), createReturnStore2);
router.delete('/:id', auth, requirePermission('purchases', 'delete'), deleteReturnStore2);

export default router;

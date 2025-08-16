import express from 'express';
import { getTransfers, createTransfer, updateTransfer, deleteTransfer } from '../controllers/transferController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requirePermission('transfers', 'view'), getTransfers);
router.post('/', auth, requirePermission('transfers', 'edit'), createTransfer);
router.put('/:id', auth, requirePermission('transfers', 'edit'), updateTransfer);
router.delete('/:id', auth, requirePermission('transfers', 'delete'), deleteTransfer);

export default router;

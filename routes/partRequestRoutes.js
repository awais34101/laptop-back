import express from 'express';
import auth, { requirePermission } from '../middleware/auth.js';
import { listPartRequests, createPartRequest, updatePartRequestStatus, deletePartRequest, getItemPriceHistory } from '../controllers/partRequestController.js';

const router = express.Router();

router.get('/', auth, requirePermission('parts', 'view'), listPartRequests);
router.post('/', auth, requirePermission('parts', 'edit'), createPartRequest);
router.put('/:id/status', auth, requirePermission('parts', 'edit'), updatePartRequestStatus);
router.delete('/:id', auth, requirePermission('parts', 'delete'), deletePartRequest);
router.get('/history/:itemId', auth, requirePermission('parts', 'view'), getItemPriceHistory);

export default router;

import express from 'express';
import { getSlowMoving, getLowStock } from '../controllers/alertController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/slow-moving', auth, requirePermission('warehouse', 'view'), getSlowMoving);
router.get('/low-stock', auth, requirePermission('warehouse', 'view'), getLowStock);

export default router;

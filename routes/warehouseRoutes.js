import express from 'express';
import { getWarehouseStock, getAvailableWarehouseItems } from '../controllers/warehouseController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requirePermission('warehouse', 'view'), getWarehouseStock);
// New endpoint for available items only
router.get('/available', auth, requirePermission('warehouse', 'view'), getAvailableWarehouseItems);

export default router;

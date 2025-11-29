import express from 'express';
import { getWarehouseStock, getAvailableWarehouseItems, getItemBoxInfo } from '../controllers/warehouseController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requirePermission('warehouse', 'view'), getWarehouseStock);
// New endpoint for available items only
router.get('/available', auth, requirePermission('warehouse', 'view'), getAvailableWarehouseItems);
router.get('/item/:itemId/boxes', auth, requirePermission('warehouse', 'view'), getItemBoxInfo);

export default router;

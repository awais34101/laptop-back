import express from 'express';
import { getStore2Inventory, getItemBoxInfo } from '../controllers/store2Controller.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requirePermission('store2', 'view'), getStore2Inventory);
router.get('/item/:itemId/boxes', auth, requirePermission('store2', 'view'), getItemBoxInfo);

export default router;

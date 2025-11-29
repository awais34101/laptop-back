import express from 'express';
import { getStoreInventory, getItemBoxInfo } from '../controllers/storeController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requirePermission('store', 'view'), getStoreInventory);
router.get('/item/:itemId/boxes', auth, requirePermission('store', 'view'), getItemBoxInfo);

export default router;

import express from 'express';
import { getStoreInventory } from '../controllers/storeController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requirePermission('store', 'view'), getStoreInventory);

export default router;

import express from 'express';
import { getStore2Inventory } from '../controllers/store2Controller.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requirePermission('store2', 'view'), getStore2Inventory);

export default router;

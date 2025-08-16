import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requirePermission('settings', 'view'), getSettings);
router.put('/', auth, requirePermission('settings', 'edit'), updateSettings);

export default router;

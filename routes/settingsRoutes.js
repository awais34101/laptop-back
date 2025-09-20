import express from 'express';
import { getSettings, updateSettings, autoDeleteOldRecords } from '../controllers/settingsController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requirePermission('settings', 'view'), getSettings);
router.put('/', auth, requirePermission('settings', 'edit'), updateSettings);
router.post('/auto-delete', auth, requirePermission('settings', 'edit'), autoDeleteOldRecords);

export default router;

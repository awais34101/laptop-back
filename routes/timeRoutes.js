import express from 'express';
import auth, { requirePermission } from '../middleware/auth.js';
import { clockIn, clockOut, listTimeEntries, adminUpdateEntry, deleteEntry } from '../controllers/timeController.js';

const router = express.Router();

// Self actions
router.post('/clock-in', auth, requirePermission('time', 'edit'), clockIn);
router.post('/clock-out', auth, requirePermission('time', 'edit'), clockOut);

// Admin/manager view
router.get('/', auth, requirePermission('time', 'view'), listTimeEntries);
router.put('/:id', auth, requirePermission('time', 'edit'), adminUpdateEntry);
router.delete('/:id', auth, requirePermission('time', 'delete'), deleteEntry);

export default router;

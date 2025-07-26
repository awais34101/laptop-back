import express from 'express';
import { getMyAssignedItems, getMyStats } from '../controllers/technicianSelfController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.get('/assigned-items', auth, getMyAssignedItems);
router.get('/stats', auth, getMyStats);

export default router;

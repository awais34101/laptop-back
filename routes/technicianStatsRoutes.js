import express from 'express';
import { getTechnicianStats } from '../controllers/technicianStatsController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requirePermission('technicians', 'view'), getTechnicianStats);

export default router;

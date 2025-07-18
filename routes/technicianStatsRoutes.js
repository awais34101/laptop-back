import express from 'express';
import { getTechnicianStats } from '../controllers/technicianStatsController.js';

const router = express.Router();

router.get('/', getTechnicianStats);

export default router;

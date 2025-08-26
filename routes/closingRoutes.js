// backend/routes/closingRoutes.js
import express from 'express';
import closingController from '../controllers/closingController.js';
const router = express.Router();

// GET /api/closing/:date/:storeType
router.get('/:date/:storeType', closingController.getClosingSummary);

export default router;

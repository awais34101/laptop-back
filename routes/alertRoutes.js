import express from 'express';
import { getSlowMoving, getLowStock } from '../controllers/alertController.js';

const router = express.Router();

router.get('/slow-moving', getSlowMoving);
router.get('/low-stock', getLowStock);

export default router;

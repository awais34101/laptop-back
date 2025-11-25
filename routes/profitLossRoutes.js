import express from 'express';
import auth from '../middleware/auth.js';
import { 
  getStore1ProfitLoss, 
  getStore2ProfitLoss, 
  getCombinedProfitLoss 
} from '../controllers/profitLossController.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Get profit/loss for Store 1
router.get('/store1', getStore1ProfitLoss);

// Get profit/loss for Store 2
router.get('/store2', getStore2ProfitLoss);

// Get combined profit/loss overview
router.get('/combined', getCombinedProfitLoss);

export default router;

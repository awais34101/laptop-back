import express from 'express';
import { getPurchases, createPurchase, updatePurchase } from '../controllers/purchaseController.js';

const router = express.Router();


router.get('/', getPurchases);
router.post('/', createPurchase);
router.put('/:id', updatePurchase);

export default router;

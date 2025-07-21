import express from 'express';
import { getSales, createSale, deleteSale } from '../controllers/saleController.js';

const router = express.Router();


router.get('/', getSales);
router.post('/', createSale);
router.delete('/:id', deleteSale);

export default router;

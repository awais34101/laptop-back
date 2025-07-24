import express from 'express';
import { getSalesStore2, createSaleStore2, deleteSaleStore2 } from '../controllers/saleStore2Controller.js';

const router = express.Router();

router.get('/', getSalesStore2);
router.post('/', createSaleStore2);
router.delete('/:id', deleteSaleStore2);

export default router;

import express from 'express';
import { getTransfers, createTransfer } from '../controllers/transferController.js';

const router = express.Router();

router.get('/', getTransfers);
router.post('/', createTransfer);

export default router;

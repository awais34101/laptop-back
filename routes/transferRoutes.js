import express from 'express';
import { getTransfers, createTransfer } from '../controllers/transferController.js';

const router = express.Router();


import { updateTransfer, deleteTransfer } from '../controllers/transferController.js';

router.get('/', getTransfers);
router.post('/', createTransfer);
router.put('/:id', updateTransfer);
router.delete('/:id', deleteTransfer);

export default router;

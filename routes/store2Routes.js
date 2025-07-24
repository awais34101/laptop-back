import express from 'express';
import { getStore2Inventory } from '../controllers/store2Controller.js';

const router = express.Router();

router.get('/', getStore2Inventory);

export default router;

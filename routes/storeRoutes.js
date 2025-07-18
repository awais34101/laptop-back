import express from 'express';
import { getStoreInventory } from '../controllers/storeController.js';

const router = express.Router();

router.get('/', getStoreInventory);

export default router;

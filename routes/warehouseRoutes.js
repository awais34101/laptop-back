import express from 'express';
import { getWarehouseStock, getAvailableWarehouseItems } from '../controllers/warehouseController.js';

const router = express.Router();

router.get('/', getWarehouseStock);
// New endpoint for available items only
router.get('/available', getAvailableWarehouseItems);

export default router;

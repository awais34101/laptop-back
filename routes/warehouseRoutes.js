import express from 'express';
import { getWarehouseStock } from '../controllers/warehouseController.js';

const router = express.Router();

router.get('/', getWarehouseStock);

export default router;

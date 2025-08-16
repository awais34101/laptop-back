import express from 'express';
import { getItems, createItem, updateItem, deleteItem } from '../controllers/itemController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requirePermission('items', 'view'), getItems);
router.post('/', auth, requirePermission('items', 'edit'), createItem);
router.put('/:id', auth, requirePermission('items', 'edit'), updateItem);
router.delete('/:id', auth, requirePermission('items', 'delete'), deleteItem);

export default router;

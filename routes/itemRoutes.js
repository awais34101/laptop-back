import express from 'express';
import { getItems, createItem, updateItem, deleteItem } from '../controllers/itemController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

// Allow items list if user has either items.view OR sales.view
// Also allow staff role and users with partsInventory.view so Transfer dialog works for staff
const allowItemsList = (req, res, next) => {
	try {
		if (req.user?.role === 'admin') return next();
		if (req.user?.role === 'staff') return next();
		const perms = req.user?.permissions || {};
		if (perms.items?.view || perms.sales?.view || perms.partsInventory?.view) return next();
		return res.status(403).json({ error: 'Insufficient permissions' });
	} catch {
		return res.status(403).json({ error: 'Insufficient permissions' });
	}
};

router.get('/', auth, allowItemsList, getItems);
router.post('/', auth, requirePermission('items', 'edit'), createItem);
router.put('/:id', auth, requirePermission('items', 'edit'), updateItem);
router.delete('/:id', auth, requirePermission('items', 'delete'), deleteItem);

export default router;

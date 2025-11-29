import express from 'express';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getInactiveCustomers } from '../controllers/customerController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requirePermission('customers', 'view'), getCustomers);
router.get('/inactive', auth, requirePermission('customers', 'view'), getInactiveCustomers);
router.post('/', auth, requirePermission('customers', 'edit'), createCustomer);
router.put('/:id', auth, requirePermission('customers', 'edit'), updateCustomer);
router.delete('/:id', auth, requirePermission('customers', 'delete'), deleteCustomer);

export default router;

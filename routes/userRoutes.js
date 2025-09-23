import express from 'express';
import UserController from '../controllers/userController.js';
import auth, { requireRole, requirePermission, requireSelfOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Authentication routes
router.post('/login', UserController.login);

// Profile routes
router.get('/profile', auth, UserController.getProfile);

// Password management
router.post('/change-password', auth, UserController.changePassword);
router.post('/:userId/change-password', auth, requireRole('admin'), UserController.changePassword);

// User management routes (permission-based access)
router.get('/list', auth, requirePermission('users', 'view'), UserController.listUsers);
router.post('/create', auth, requirePermission('users', 'add'), UserController.createUser);
router.put('/:id/update', auth, requirePermission('users', 'edit'), UserController.updateUser);
router.delete('/:id/delete', auth, requirePermission('users', 'delete'), UserController.deleteUser);
router.delete('/:id/permanent', auth, requireRole('admin'), UserController.permanentDeleteUser); // Keep admin-only for permanent delete

// Bulk operations (admin only)
router.post('/bulk-update', auth, requireRole('admin'), UserController.bulkUpdateUsers);

// Permission management
router.get('/permissions', auth, requirePermission('users', 'view'), UserController.getAvailablePermissions);

// Legacy routes for backward compatibility
router.post('/add-staff', auth, requirePermission('users', 'add'), UserController.createUser);
router.put('/:id/edit', auth, requirePermission('users', 'edit'), UserController.updateUser);

export default router;

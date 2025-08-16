import express from 'express';
import * as controller from '../controllers/technicianAssignmentController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();
router.get('/', auth, requirePermission('technicians', 'view'), controller.getAssignments);
router.post('/', auth, requirePermission('technicians', 'edit'), controller.createAssignment);
router.delete('/unassign', auth, requirePermission('technicians', 'edit'), controller.unassignItems);
router.put('/comment', auth, requirePermission('technicians', 'edit'), controller.updateItemComment);
router.post('/cleanup', auth, requirePermission('technicians', 'delete'), controller.cleanupInvalidAssignments);

export default router;

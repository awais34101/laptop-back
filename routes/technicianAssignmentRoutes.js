import express from 'express';
import * as controller from '../controllers/technicianAssignmentController.js';

const router = express.Router();
router.get('/', controller.getAssignments);
router.post('/', controller.createAssignment);
router.delete('/unassign', controller.unassignItems);
router.put('/comment', controller.updateItemComment);
router.post('/cleanup', controller.cleanupInvalidAssignments);

export default router;

import express from 'express';
import * as controller from '../controllers/technicianAssignmentController.js';

const router = express.Router();
router.get('/', controller.getAssignments);
router.post('/', controller.createAssignment);

export default router;

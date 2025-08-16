import express from 'express';
import { getTechnicians, createTechnician, updateTechnician, deleteTechnician } from '../controllers/technicianController.js';
import auth, { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, requirePermission('technicians', 'view'), getTechnicians);
router.post('/', auth, requirePermission('technicians', 'edit'), createTechnician);
router.put('/:id', auth, requirePermission('technicians', 'edit'), updateTechnician);
router.delete('/:id', auth, requirePermission('technicians', 'delete'), deleteTechnician);

export default router;

import express from 'express';
import { getTechnicians, createTechnician, updateTechnician, deleteTechnician } from '../controllers/technicianController.js';

const router = express.Router();

router.get('/', getTechnicians);
router.post('/', createTechnician);
router.put('/:id', updateTechnician);
router.delete('/:id', deleteTechnician);

export default router;

import express from 'express';
import auth from '../middleware/auth.js';
import * as checklistController from '../controllers/checklistController.js';

const router = express.Router();

// ==================== CATEGORIES ====================
router.get('/categories', auth, checklistController.getCategories);
router.post('/categories', auth, checklistController.createCategory);
router.put('/categories/:id', auth, checklistController.updateCategory);
router.delete('/categories/:id', auth, checklistController.deleteCategory);

// ==================== TEMPLATES ====================
router.get('/templates', auth, checklistController.getTemplates);
router.get('/templates/:id', auth, checklistController.getTemplateById);
router.post('/templates', auth, checklistController.createTemplate);
router.put('/templates/:id', auth, checklistController.updateTemplate);
router.delete('/templates/:id', auth, checklistController.deleteTemplate);

// ==================== COMPLETIONS ====================
router.get('/completions', auth, checklistController.getCompletions);
router.get('/history', auth, checklistController.getCompletions); // Alias for reports
router.get('/stats', auth, checklistController.getCompletionStats);
router.get('/pending', auth, checklistController.getTodaysPending);
router.post('/completions', auth, checklistController.startCompletion);
router.put('/completions/:id', auth, checklistController.updateCompletion);
router.delete('/completions/:id', auth, checklistController.deleteCompletion);

export default router;

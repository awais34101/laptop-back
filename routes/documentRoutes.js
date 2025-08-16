import express from 'express';
import auth, { requirePermission } from '../middleware/auth.js';
import { listDocuments, createDocument, updateDocument, deleteDocument, listCategories } from '../controllers/documentController.js';

const router = express.Router();

router.get('/', auth, requirePermission('documents', 'view'), listDocuments);
router.get('/categories', auth, requirePermission('documents', 'view'), listCategories);
router.post('/', auth, requirePermission('documents', 'edit'), createDocument);
router.put('/:id', auth, requirePermission('documents', 'edit'), updateDocument);
router.delete('/:id', auth, requirePermission('documents', 'delete'), deleteDocument);

export default router;

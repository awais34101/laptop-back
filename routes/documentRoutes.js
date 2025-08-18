import express from 'express';
import auth, { requirePermission } from '../middleware/auth.js';
import { listDocuments, createDocument, updateDocument, deleteDocument, listCategories } from '../controllers/documentController.js';

const router = express.Router();

router.get('/', auth, requirePermission('documents', 'view'), listDocuments);
router.get('/categories', auth, requirePermission('documents', 'view'), listCategories);
// Allow creating documents with 'view' permission so staff can upload
router.post('/', auth, requirePermission('documents', 'view'), createDocument);
router.put('/:id', auth, requirePermission('documents', 'edit'), updateDocument);
router.delete('/:id', auth, requirePermission('documents', 'delete'), deleteDocument);

export default router;

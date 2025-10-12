import express from 'express';
import {
  getBoxes,
  getBox,
  searchBoxes,
  findItemInBox,
  createBox,
  updateBox,
  deleteBox,
  addItemToBox,
  removeItemFromBox,
  updateItemInBox,
  getBoxStats
} from '../controllers/inventoryBoxController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Box management routes
router.get('/', getBoxes);
router.get('/stats', getBoxStats);
router.get('/search', searchBoxes);
router.get('/:id', getBox);
router.post('/', createBox);
router.put('/:id', updateBox);
router.delete('/:id', deleteBox);

// Item-in-box management routes
router.post('/:id/items', addItemToBox);
router.put('/:id/items/:itemId', updateItemInBox);
router.delete('/:id/items/:itemId', removeItemFromBox);
router.get('/item/:itemId', findItemInBox);

export default router;

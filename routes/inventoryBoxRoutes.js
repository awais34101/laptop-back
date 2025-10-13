import express from 'express';
import {
  getBoxes,
  getBox,
  searchBoxes,
  findItemInBox,
  createBox,
  smartCreateBoxes,
  updateBox,
  deleteBox,
  addItemToBox,
  removeItemFromBox,
  updateItemInBox,
  getBoxStats,
  getAvailableInventory,
  autoDistributeItems,
  removeItemsFromBoxes,
  getItemDistribution,
  getBoxesByLocation
} from '../controllers/inventoryBoxController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Box management routes
router.get('/', getBoxes);
router.get('/stats', getBoxStats);
router.get('/search', searchBoxes);
router.get('/location/:location', getBoxesByLocation);
router.get('/location/:location/available', getAvailableInventory);
router.get('/location/:location/item/:itemId/distribution', getItemDistribution);
router.get('/:id', getBox);
router.post('/', createBox);
router.post('/smart-create', smartCreateBoxes);
router.put('/:id', updateBox);
router.delete('/:id', deleteBox);

// Item-in-box management routes
router.post('/:id/items', addItemToBox);
router.put('/:id/items/:itemId', updateItemInBox);
router.delete('/:id/items/:itemId', removeItemFromBox);
router.get('/item/:itemId', findItemInBox);

// Auto-distribution routes
router.post('/distribute', autoDistributeItems);
router.post('/remove', removeItemsFromBoxes);

export default router;

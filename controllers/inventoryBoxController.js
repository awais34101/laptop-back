import InventoryBox from '../models/InventoryBox.js';
import Item from '../models/Item.js';
import Joi from 'joi';

// Validation schemas
const boxSchema = Joi.object({
  boxNumber: Joi.string().required(),
  location: Joi.string().required(),
  description: Joi.string().allow(''),
  capacity: Joi.number().min(1).default(50),
  status: Joi.string().valid('Active', 'Full', 'Inactive').default('Active')
});

const addItemToBoxSchema = Joi.object({
  itemId: Joi.string().required(),
  quantity: Joi.number().min(0).default(0),
  notes: Joi.string().allow('')
});

// Get all boxes
export const getBoxes = async (req, res) => {
  try {
    const boxes = await InventoryBox.find().populate('items.itemId', 'name unit category').sort({ boxNumber: 1 });
    res.json(boxes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single box
export const getBox = async (req, res) => {
  try {
    const box = await InventoryBox.findById(req.params.id).populate('items.itemId', 'name unit category');
    if (!box) return res.status(404).json({ error: 'Box not found' });
    res.json(box);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Search for item by name or box number
export const searchBoxes = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Search by box number or location
    const boxMatches = await InventoryBox.find({
      $or: [
        { boxNumber: { $regex: query, $options: 'i' } },
        { location: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    }).populate('items.itemId', 'name unit category');

    // Search by item name
    const itemMatches = await InventoryBox.find({
      'items.itemName': { $regex: query, $options: 'i' }
    }).populate('items.itemId', 'name unit category');

    // Combine and deduplicate results
    const allMatches = [...boxMatches, ...itemMatches];
    const uniqueBoxes = Array.from(new Map(allMatches.map(box => [box._id.toString(), box])).values());

    res.json(uniqueBoxes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Find which box contains a specific item
export const findItemInBox = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const boxes = await InventoryBox.find({
      'items.itemId': itemId
    }).populate('items.itemId', 'name unit category');

    if (boxes.length === 0) {
      return res.status(404).json({ error: 'Item not found in any box' });
    }

    res.json(boxes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new box
export const createBox = async (req, res) => {
  try {
    const { error } = boxSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const exists = await InventoryBox.findOne({ boxNumber: req.body.boxNumber });
    if (exists) return res.status(400).json({ error: 'Box number already exists' });

    const box = new InventoryBox(req.body);
    await box.save();
    res.status(201).json(box);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update box details
export const updateBox = async (req, res) => {
  try {
    const { error } = boxSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const box = await InventoryBox.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    ).populate('items.itemId', 'name unit category');

    if (!box) return res.status(404).json({ error: 'Box not found' });
    res.json(box);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete box
export const deleteBox = async (req, res) => {
  try {
    const box = await InventoryBox.findById(req.params.id);
    if (!box) return res.status(404).json({ error: 'Box not found' });

    if (box.items && box.items.length > 0) {
      return res.status(400).json({ error: 'Cannot delete box with items. Remove items first.' });
    }

    await InventoryBox.findByIdAndDelete(req.params.id);
    res.json({ message: 'Box deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add item to box
export const addItemToBox = async (req, res) => {
  try {
    const { error } = addItemToBoxSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { itemId, quantity, notes } = req.body;
    const box = await InventoryBox.findById(req.params.id);
    
    if (!box) return res.status(404).json({ error: 'Box not found' });

    // Check if item exists
    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Check if item already in this box
    const existingItemIndex = box.items.findIndex(i => i.itemId.toString() === itemId);
    
    if (existingItemIndex > -1) {
      // Update existing item
      box.items[existingItemIndex].quantity = quantity;
      box.items[existingItemIndex].notes = notes || box.items[existingItemIndex].notes;
    } else {
      // Add new item
      box.items.push({
        itemId,
        itemName: item.name,
        quantity,
        notes
      });
    }

    box.updatedAt = Date.now();
    await box.save();
    
    const updatedBox = await InventoryBox.findById(box._id).populate('items.itemId', 'name unit category');
    res.json(updatedBox);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Remove item from box
export const removeItemFromBox = async (req, res) => {
  try {
    const { itemId } = req.params;
    const box = await InventoryBox.findById(req.params.id);
    
    if (!box) return res.status(404).json({ error: 'Box not found' });

    const initialLength = box.items.length;
    box.items = box.items.filter(i => i.itemId && i.itemId.toString() !== itemId.toString());
    
    if (box.items.length === initialLength) {
      return res.status(404).json({ error: 'Item not found in this box' });
    }
    
    box.updatedAt = Date.now();
    await box.save();
    
    const updatedBox = await InventoryBox.findById(box._id).populate('items.itemId', 'name unit category');
    res.json(updatedBox);
  } catch (err) {
    console.error('Remove item error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update item quantity in box
export const updateItemInBox = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity, notes } = req.body;
    
    const box = await InventoryBox.findById(req.params.id);
    if (!box) return res.status(404).json({ error: 'Box not found' });

    const itemIndex = box.items.findIndex(i => i.itemId.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in this box' });
    }

    if (quantity !== undefined) box.items[itemIndex].quantity = quantity;
    if (notes !== undefined) box.items[itemIndex].notes = notes;
    
    box.updatedAt = Date.now();
    await box.save();
    
    const updatedBox = await InventoryBox.findById(box._id).populate('items.itemId', 'name unit category');
    res.json(updatedBox);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get box statistics
export const getBoxStats = async (req, res) => {
  try {
    const totalBoxes = await InventoryBox.countDocuments();
    const activeBoxes = await InventoryBox.countDocuments({ status: 'Active' });
    const fullBoxes = await InventoryBox.countDocuments({ status: 'Full' });
    
    const boxes = await InventoryBox.find();
    const totalItems = boxes.reduce((sum, box) => sum + box.items.length, 0);
    
    res.json({
      totalBoxes,
      activeBoxes,
      fullBoxes,
      totalItems,
      averageItemsPerBox: totalBoxes > 0 ? (totalItems / totalBoxes).toFixed(2) : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

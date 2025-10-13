import InventoryBox from '../models/InventoryBox.js';
import Item from '../models/Item.js';
import Warehouse from '../models/Warehouse.js';
import Store from '../models/Store.js';
import Store2 from '../models/Store2.js';
import Joi from 'joi';

// Validation schemas
const boxSchema = Joi.object({
  boxNumber: Joi.string().required(),
  location: Joi.string().valid('Store', 'Store2', 'Warehouse').required(),
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
    let boxes = await InventoryBox.find().populate('items.itemId', 'name unit category');
    
    // Sort boxes numerically by boxNumber within each location
    boxes.sort((a, b) => {
      // First sort by location
      if (a.location !== b.location) {
        return a.location.localeCompare(b.location);
      }
      // Then sort numerically by boxNumber
      const numA = parseInt(a.boxNumber) || 0;
      const numB = parseInt(b.boxNumber) || 0;
      return numA - numB;
    });
    
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

// Smart create boxes with auto-assignment
export const smartCreateBoxes = async (req, res) => {
  try {
    const { location, itemId, numberOfBoxes, capacity } = req.body;

    if (!location || !itemId || !numberOfBoxes) {
      return res.status(400).json({ error: 'Location, itemId, and numberOfBoxes are required' });
    }

    // Get item details
    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Get available inventory
    let inventoryModel;
    if (location === 'Warehouse') inventoryModel = Warehouse;
    else if (location === 'Store') inventoryModel = Store;
    else inventoryModel = Store2;

    const inventory = await inventoryModel.findOne({ item: itemId });
    if (!inventory) {
      return res.status(404).json({ error: 'Item not found in inventory' });
    }

    const totalAvailable = location === 'Warehouse' ? inventory.quantity : inventory.remaining_quantity;
    
    // Get items already in boxes
    const existingBoxes = await InventoryBox.find({ location, 'items.itemId': itemId });
    const alreadyInBoxes = existingBoxes.reduce((sum, box) => {
      const itemInBox = box.items.find(i => i.itemId.toString() === itemId);
      return sum + (itemInBox?.quantity || 0);
    }, 0);

    const availableForBoxing = totalAvailable - alreadyInBoxes;
    
    if (availableForBoxing <= 0) {
      return res.status(400).json({ error: 'No items available for boxing' });
    }

    // Find the next box number - get all boxes and find the max numerically
    const allBoxes = await InventoryBox.find({ location });
    let nextBoxNumber = 1;
    if (allBoxes.length > 0) {
      const boxNumbers = allBoxes
        .map(box => parseInt(box.boxNumber))
        .filter(num => !isNaN(num));
      
      if (boxNumbers.length > 0) {
        const maxBoxNumber = Math.max(...boxNumbers);
        nextBoxNumber = maxBoxNumber + 1;
      }
    }

    console.log(`[SmartCreate] ${location} - Next box number will be: ${nextBoxNumber}`);

    const boxCapacity = capacity || 50;
    const totalCapacity = numberOfBoxes * boxCapacity;
    let remainingQty = availableForBoxing;
    const createdBoxes = [];

    // Create boxes with smart assignment
    for (let i = 0; i < numberOfBoxes; i++) {
      const boxNumber = (nextBoxNumber + i).toString();
      const qtyForThisBox = Math.min(remainingQty, boxCapacity);
      
      const newBox = new InventoryBox({
        boxNumber,
        location,
        capacity: boxCapacity,
        description: `${item.name} - Box ${i + 1}/${numberOfBoxes}`,
        status: qtyForThisBox >= boxCapacity ? 'Full' : 'Active',
        items: [{
          itemId,
          itemName: item.name,
          quantity: qtyForThisBox,
          notes: qtyForThisBox > boxCapacity 
            ? `⚠️ OVERFILL: ${qtyForThisBox}/${boxCapacity}` 
            : `Auto-assigned on ${new Date().toLocaleDateString()}`
        }]
      });

      await newBox.save();
      createdBoxes.push(newBox);
      remainingQty -= qtyForThisBox;
    }

    res.status(201).json({
      message: `Successfully created ${numberOfBoxes} box(es) for ${item.name}`,
      boxes: createdBoxes,
      summary: {
        totalAvailable: availableForBoxing,
        totalCapacity,
        distributed: availableForBoxing - remainingQty,
        remaining: remainingQty,
        overfill: availableForBoxing > totalCapacity
      }
    });
  } catch (err) {
    console.error('[SmartCreate] Error:', err);
    
    // Handle duplicate key error
    if (err.code === 11000) {
      const boxNumber = err.keyValue?.boxNumber;
      return res.status(409).json({ 
        error: `Box number ${boxNumber} already exists. Please try again.`,
        code: 'DUPLICATE_BOX_NUMBER'
      });
    }
    
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

// Get available inventory for a location
export const getAvailableInventory = async (req, res) => {
  try {
    const { location } = req.params;
    
    if (!['Store', 'Store2', 'Warehouse'].includes(location)) {
      return res.status(400).json({ error: 'Invalid location' });
    }

    let inventoryModel;
    if (location === 'Warehouse') inventoryModel = Warehouse;
    else if (location === 'Store') inventoryModel = Store;
    else inventoryModel = Store2;

    console.log(`[InventoryBox] Fetching inventory for ${location}...`);
    const inventory = await inventoryModel.find().populate('item', 'name unit category');
    console.log(`[InventoryBox] ${location} - Total inventory items:`, inventory.length);
    
    // Check for items without proper population
    const invalidItems = inventory.filter(inv => !inv.item || !inv.item._id);
    if (invalidItems.length > 0) {
      console.warn(`[InventoryBox] ${location} - Found ${invalidItems.length} items without valid item reference`);
    }
    
    // Get items already in boxes for this location
    const boxes = await InventoryBox.find({ location });
    console.log(`[InventoryBox] ${location} - Total boxes:`, boxes.length);
    
    const itemsInBoxes = {};
    
    boxes.forEach(box => {
      box.items.forEach(item => {
        if (item.itemId) {
          const itemIdStr = item.itemId.toString();
          itemsInBoxes[itemIdStr] = (itemsInBoxes[itemIdStr] || 0) + item.quantity;
        }
      });
    });

    // Calculate available (not yet in boxes)
    const availableItems = inventory
      .filter(inv => inv.item && inv.item._id) // Filter out invalid items
      .map(inv => {
        const totalQty = location === 'Warehouse' ? inv.quantity : inv.remaining_quantity;
        const inBoxes = itemsInBoxes[inv.item._id.toString()] || 0;
        
        return {
          itemId: inv.item._id,
          itemName: inv.item.name,
          unit: inv.item.unit,
          category: inv.item.category,
          totalQuantity: totalQty,
          quantityInBoxes: inBoxes,
          availableForBoxing: Math.max(0, totalQty - inBoxes)
        };
      })
      .filter(item => item.availableForBoxing > 0);

    console.log(`[InventoryBox] ${location} - Available items for boxing:`, availableItems.length);
    if (availableItems.length > 0) {
      console.log('Sample:', availableItems.slice(0, 3).map(i => `${i.itemName}: ${i.availableForBoxing}`));
    }

    res.json(availableItems);
  } catch (err) {
    console.error('[InventoryBox] Error in getAvailableInventory:', err);
    res.status(500).json({ error: err.message });
  }
};

// Auto-distribute items to boxes
export const autoDistributeItems = async (req, res) => {
  try {
    const { location, itemId, quantity } = req.body;

    if (!['Store', 'Store2', 'Warehouse'].includes(location)) {
      return res.status(400).json({ error: 'Invalid location' });
    }

    if (!itemId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid item or quantity' });
    }

    // Get item details
    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Get all boxes for this location, sorted by box number (ascending)
    const boxes = await InventoryBox.find({ location, status: { $in: ['Active', 'Full'] } })
      .sort({ boxNumber: 1 });

    if (boxes.length === 0) {
      return res.status(400).json({ error: `No boxes available in ${location}` });
    }

    let remainingQty = quantity;
    const updatedBoxes = [];

    // Distribute items across boxes
    for (let box of boxes) {
      if (remainingQty <= 0) break;

      // Calculate current total items in box
      const currentTotal = box.items.reduce((sum, item) => sum + item.quantity, 0);
      const availableCapacity = box.capacity - currentTotal;

      if (availableCapacity <= 0) {
        // Mark box as full
        if (box.status !== 'Full') {
          box.status = 'Full';
          await box.save();
        }
        continue;
      }

      // Find if item already exists in this box
      const existingItemIndex = box.items.findIndex(i => i.itemId.toString() === itemId);
      const qtyToAdd = Math.min(remainingQty, availableCapacity);

      if (existingItemIndex > -1) {
        box.items[existingItemIndex].quantity += qtyToAdd;
      } else {
        box.items.push({
          itemId,
          itemName: item.name,
          quantity: qtyToAdd,
          notes: `Auto-distributed on ${new Date().toLocaleDateString()}`
        });
      }

      remainingQty -= qtyToAdd;
      box.updatedAt = Date.now();

      // Update status
      const newTotal = box.items.reduce((sum, item) => sum + item.quantity, 0);
      box.status = newTotal >= box.capacity ? 'Full' : 'Active';

      await box.save();
      updatedBoxes.push(box);
    }

    if (remainingQty > 0) {
      return res.status(400).json({ 
        error: `Not enough box capacity. ${remainingQty} items could not be distributed. Please add more boxes.`,
        distributed: quantity - remainingQty,
        remaining: remainingQty,
        updatedBoxes
      });
    }

    // Populate and return updated boxes
    const populatedBoxes = await InventoryBox.find({ 
      _id: { $in: updatedBoxes.map(b => b._id) } 
    }).populate('items.itemId', 'name unit category');

    res.json({
      message: `Successfully distributed ${quantity} items across ${updatedBoxes.length} box(es)`,
      distributed: quantity,
      boxesUpdated: updatedBoxes.length,
      boxes: populatedBoxes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Remove items from boxes using FIFO (highest box number first)
export const removeItemsFromBoxes = async (req, res) => {
  try {
    const { location, itemId, quantity } = req.body;

    if (!['Store', 'Store2', 'Warehouse'].includes(location)) {
      return res.status(400).json({ error: 'Invalid location' });
    }

    if (!itemId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid item or quantity' });
    }

    // Get boxes containing this item, sorted by box number (descending for FIFO)
    const boxes = await InventoryBox.find({ 
      location, 
      'items.itemId': itemId 
    }).sort({ boxNumber: -1 });

    if (boxes.length === 0) {
      return res.status(404).json({ error: 'Item not found in any box' });
    }

    let remainingQty = quantity;
    const updatedBoxes = [];

    // Remove from highest box number first (FIFO)
    for (let box of boxes) {
      if (remainingQty <= 0) break;

      const itemIndex = box.items.findIndex(i => i.itemId.toString() === itemId);
      if (itemIndex === -1) continue;

      const itemInBox = box.items[itemIndex];
      const qtyToRemove = Math.min(remainingQty, itemInBox.quantity);

      itemInBox.quantity -= qtyToRemove;
      remainingQty -= qtyToRemove;

      // Remove item from box if quantity is 0
      if (itemInBox.quantity <= 0) {
        box.items.splice(itemIndex, 1);
      }

      // Update box status
      const newTotal = box.items.reduce((sum, item) => sum + item.quantity, 0);
      box.status = newTotal >= box.capacity ? 'Full' : 'Active';
      box.updatedAt = Date.now();

      await box.save();
      updatedBoxes.push(box);
    }

    if (remainingQty > 0) {
      return res.status(400).json({ 
        error: `Not enough items in boxes. ${remainingQty} items could not be removed.`,
        removed: quantity - remainingQty,
        remaining: remainingQty
      });
    }

    const populatedBoxes = await InventoryBox.find({ 
      _id: { $in: updatedBoxes.map(b => b._id) } 
    }).populate('items.itemId', 'name unit category');

    res.json({
      message: `Successfully removed ${quantity} items from ${updatedBoxes.length} box(es) using FIFO`,
      removed: quantity,
      boxesUpdated: updatedBoxes.length,
      boxes: populatedBoxes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get items distribution across boxes
export const getItemDistribution = async (req, res) => {
  try {
    const { location, itemId } = req.params;

    if (!['Store', 'Store2', 'Warehouse'].includes(location)) {
      return res.status(400).json({ error: 'Invalid location' });
    }

    const boxes = await InventoryBox.find({ 
      location, 
      'items.itemId': itemId 
    })
    .populate('items.itemId', 'name unit category')
    .sort({ boxNumber: 1 });

    const distribution = boxes.map(box => {
      const item = box.items.find(i => i.itemId._id.toString() === itemId);
      return {
        boxId: box._id,
        boxNumber: box.boxNumber,
        quantity: item ? item.quantity : 0,
        capacity: box.capacity,
        status: box.status,
        notes: item ? item.notes : ''
      };
    });

    const totalInBoxes = distribution.reduce((sum, d) => sum + d.quantity, 0);

    res.json({
      itemId,
      location,
      totalQuantityInBoxes: totalInBoxes,
      numberOfBoxes: distribution.length,
      distribution
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all boxes by location with inventory summary
export const getBoxesByLocation = async (req, res) => {
  try {
    const { location } = req.params;

    if (!['Store', 'Store2', 'Warehouse'].includes(location)) {
      return res.status(400).json({ error: 'Invalid location' });
    }

    let boxes = await InventoryBox.find({ location })
      .populate('items.itemId', 'name unit category');

    // Sort boxes numerically by boxNumber (not alphabetically)
    boxes.sort((a, b) => {
      const numA = parseInt(a.boxNumber) || 0;
      const numB = parseInt(b.boxNumber) || 0;
      return numA - numB;
    });

    // Get inventory totals for this location
    let inventoryModel;
    if (location === 'Warehouse') inventoryModel = Warehouse;
    else if (location === 'Store') inventoryModel = Store;
    else inventoryModel = Store2;

    const inventory = await inventoryModel.find().populate('item', 'name');
    
    const boxesWithSummary = boxes.map(box => {
      const totalItems = box.items.reduce((sum, item) => sum + item.quantity, 0);
      const utilization = box.capacity > 0 ? ((totalItems / box.capacity) * 100).toFixed(1) : 0;
      
      return {
        ...box.toObject(),
        summary: {
          totalItems,
          uniqueItems: box.items.length,
          utilization: `${utilization}%`,
          availableCapacity: box.capacity - totalItems
        }
      };
    });

    res.json({
      location,
      totalBoxes: boxes.length,
      boxes: boxesWithSummary,
      inventorySummary: {
        totalItems: inventory.length,
        totalQuantity: inventory.reduce((sum, inv) => 
          sum + (location === 'Warehouse' ? inv.quantity : inv.remaining_quantity), 0
        )
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


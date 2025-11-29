import Store2 from '../models/Store2.js';
import Item from '../models/Item.js';
import InventoryBox from '../models/InventoryBox.js';

export const getStore2Inventory = async (req, res) => {
  try {
    const inventory = await Store2.find().populate('item');
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Store2 inventory' });
  }
};

// Get box information for a specific item in Store2
export const getItemBoxInfo = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    console.log('[Store2 Box Info] Looking for itemId:', itemId);
    
    // Find all boxes in Store2 that contain this item
    const boxes = await InventoryBox.find({
      location: 'Store2',
      'items.itemId': itemId
    }).populate('items.itemId', 'name unit');
    
    console.log('[Store2 Box Info] Found boxes:', boxes.length);
    console.log('[Store2 Box Info] First box sample:', boxes[0] ? {
      boxNumber: boxes[0].boxNumber,
      location: boxes[0].location,
      itemCount: boxes[0].items.length
    } : 'No boxes');
    
    // Extract only the relevant item information from each box
    const boxInfo = boxes.map(box => {
      const itemInBox = box.items.find(item => 
        item.itemId && item.itemId._id && item.itemId._id.toString() === itemId
      );
      
      if (!itemInBox) {
        console.log('[Store2 Box Info] Item not found in box', box.boxNumber);
        return null;
      }
      
      return {
        boxNumber: box.boxNumber,
        boxId: box._id,
        quantity: itemInBox.quantity,
        notes: itemInBox.notes,
        boxStatus: box.status,
        boxDescription: box.description
      };
    }).filter(info => info && info.quantity > 0); // Only show boxes with quantity > 0
    
    console.log('[Store2 Box Info] Processed box info:', boxInfo.length, 'boxes with this item');
    
    // Calculate total quantity across all boxes
    const totalInBoxes = boxInfo.reduce((sum, box) => sum + box.quantity, 0);
    
    const response = {
      itemId,
      boxes: boxInfo,
      totalBoxes: boxInfo.length,
      totalQuantity: totalInBoxes
    };
    
    console.log('[Store2 Box Info] Response:', JSON.stringify(response, null, 2));
    
    res.json(response);
  } catch (err) {
    console.error('[Store2 Box Info] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

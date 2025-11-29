// Get only available items in warehouse (quantity > 0)
export const getAvailableWarehouseItems = async (req, res) => {
  try {
    const stock = await Warehouse.find({ quantity: { $gt: 0 } }).populate('item');
    // Format as array of { _id, name, quantity, ... }
    const items = stock.map(entry => {
      if (!entry.item) return null;
      return {
        _id: entry.item._id,
        name: entry.item.name,
        unit: entry.item.unit,
        category: entry.item.category,
        average_price: entry.item.average_price,
        last_sale_date: entry.item.last_sale_date,
        sale_count: entry.item.sale_count,
        quantity: entry.quantity
      };
    }).filter(Boolean);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
import Warehouse from '../models/Warehouse.js';
import Item from '../models/Item.js';
import InventoryBox from '../models/InventoryBox.js';

export const getWarehouseStock = async (req, res) => {
  try {
    const stock = await Warehouse.find().populate('item');
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get box information for a specific item in Warehouse
export const getItemBoxInfo = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    console.log('[Warehouse Box Info] Looking for itemId:', itemId);
    
    // Find all boxes in Warehouse that contain this item
    const boxes = await InventoryBox.find({
      location: 'Warehouse',
      'items.itemId': itemId
    }).populate('items.itemId', 'name unit');
    
    console.log('[Warehouse Box Info] Found boxes:', boxes.length);
    console.log('[Warehouse Box Info] First box sample:', boxes[0] ? {
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
        console.log('[Warehouse Box Info] Item not found in box', box.boxNumber);
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
    
    console.log('[Warehouse Box Info] Processed box info:', boxInfo.length, 'boxes with this item');
    
    // Calculate total quantity across all boxes
    const totalInBoxes = boxInfo.reduce((sum, box) => sum + box.quantity, 0);
    
    const response = {
      itemId,
      boxes: boxInfo,
      totalBoxes: boxInfo.length,
      totalQuantity: totalInBoxes
    };
    
    console.log('[Warehouse Box Info] Response:', JSON.stringify(response, null, 2));
    
    res.json(response);
  } catch (err) {
    console.error('[Warehouse Box Info] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

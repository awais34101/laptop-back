import Transfer from '../models/Transfer.js';
import Warehouse from '../models/Warehouse.js';
import Store from '../models/Store.js';
import Store2 from '../models/Store2.js';
import InventoryBox from '../models/InventoryBox.js';
import Item from '../models/Item.js';
import mongoose from 'mongoose';
import Joi from 'joi';

const transferSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      item: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
    })
  ).min(1).required(),
  from: Joi.string().valid('warehouse', 'store', 'store2').required(),
  to: Joi.string().valid('warehouse', 'store', 'store2').required(),
  technician: Joi.string().optional().allow(null, ''),
  workType: Joi.string().valid('repair', 'test', '').optional().allow(null, ''),
});

// Helper function to remove items from boxes using FIFO (highest box number first)
const removeFromBoxesFIFO = async (itemId, quantity, location, session) => {
  // Map location names to box location format
  const boxLocation = location === 'warehouse' ? 'Warehouse' : location === 'store' ? 'Store' : 'Store2';
  
  // Get boxes containing this item, sorted by box number (descending for FIFO)
  const boxes = await InventoryBox.find({ 
    location: boxLocation, 
    'items.itemId': itemId 
  }).sort({ boxNumber: -1 }).session(session);

  let remainingQty = quantity;

  // Remove from highest box number first (FIFO)
  for (let box of boxes) {
    if (remainingQty <= 0) break;

    const itemIndex = box.items.findIndex(i => i.itemId.toString() === itemId.toString());
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

    await box.save({ session });
  }

  return remainingQty === 0;
};

// Helper function to add items to boxes (find active boxes or create new ones if needed)
const addToBoxes = async (itemId, quantity, location, session) => {
  // Map location names to box location format
  const boxLocation = location === 'warehouse' ? 'Warehouse' : location === 'store' ? 'Store' : 'Store2';
  
  // Get item details
  const item = await Item.findById(itemId).session(session);
  if (!item) {
    console.warn(`Item ${itemId} not found when adding to boxes`);
    return;
  }

  // Find active boxes for this location and item, sorted by box number (ascending)
  const boxes = await InventoryBox.find({ 
    location: boxLocation,
    'items.itemId': itemId,
    status: { $ne: 'Full' }
  }).sort({ boxNumber: 1 }).session(session);

  let remainingQty = quantity;

  // Try to add to existing boxes first
  for (let box of boxes) {
    if (remainingQty <= 0) break;

    const itemIndex = box.items.findIndex(i => i.itemId.toString() === itemId.toString());
    if (itemIndex === -1) continue;

    const itemInBox = box.items[itemIndex];
    const availableSpace = box.capacity - box.items.reduce((sum, i) => sum + i.quantity, 0);
    const qtyToAdd = Math.min(remainingQty, availableSpace);

    if (qtyToAdd > 0) {
      itemInBox.quantity += qtyToAdd;
      remainingQty -= qtyToAdd;

      // Update box status
      const newTotal = box.items.reduce((sum, item) => sum + item.quantity, 0);
      box.status = newTotal >= box.capacity ? 'Full' : 'Active';
      box.updatedAt = Date.now();

      await box.save({ session });
    }
  }

  // If there's still remaining quantity, create a new box or add to boxes without this item
  if (remainingQty > 0) {
    // Try to find any active box in this location with space
    const anyActiveBox = await InventoryBox.findOne({
      location: boxLocation,
      status: { $ne: 'Full' }
    }).sort({ boxNumber: 1 }).session(session);

    if (anyActiveBox) {
      const currentTotal = anyActiveBox.items.reduce((sum, i) => sum + i.quantity, 0);
      const availableSpace = anyActiveBox.capacity - currentTotal;
      const qtyToAdd = Math.min(remainingQty, availableSpace);

      if (qtyToAdd > 0) {
        // Add this item to the box
        anyActiveBox.items.push({
          itemId,
          itemName: item.name,
          quantity: qtyToAdd,
          notes: `Added from transfer on ${new Date().toLocaleDateString()}`
        });

        remainingQty -= qtyToAdd;

        // Update box status
        const newTotal = anyActiveBox.items.reduce((sum, item) => sum + item.quantity, 0);
        anyActiveBox.status = newTotal >= anyActiveBox.capacity ? 'Full' : 'Active';
        anyActiveBox.updatedAt = Date.now();

        await anyActiveBox.save({ session });
      }
    }
  }

  // Note: If there's still remaining quantity and no boxes available, 
  // the items remain in inventory but not assigned to boxes
  // This is acceptable as boxes can be created manually later
  if (remainingQty > 0) {
    console.log(`${remainingQty} units of ${item.name} added to ${boxLocation} inventory but not assigned to boxes (no space available)`);
  }
};

export const getTransfers = async (req, res) => {
  try {
    // Check if groupByDate mode is requested
    if (req.query.groupByDate === 'true') {
      return getTransfersByDate(req, res);
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    
    // Filter by technician
    if (req.query.technician) {
      filter.technician = req.query.technician;
    }
    
    // Filter by from location
    if (req.query.from) {
      filter.from = req.query.from;
    }
    
    // Filter by to location
    if (req.query.to) {
      filter.to = req.query.to;
    }
    
    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) {
        filter.date.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        // Include the entire end date by setting time to end of day
        const endDate = new Date(req.query.endDate);
        endDate.setHours(23, 59, 59, 999);
        filter.date.$lte = endDate;
      }
    }

    const [total, transfers] = await Promise.all([
      Transfer.countDocuments(filter),
      Transfer.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.item')
        .populate('technician')
    ]);

    res.json({
      data: transfers,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get transfers grouped by date (one day per page)
const getTransfersByDate = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);

    // Build filter object
    const filter = {};
    
    // Filter by technician
    if (req.query.technician) {
      filter.technician = req.query.technician;
    }
    
    // Filter by from location
    if (req.query.from) {
      filter.from = req.query.from;
    }
    
    // Filter by to location
    if (req.query.to) {
      filter.to = req.query.to;
    }
    
    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) {
        filter.date.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate);
        endDate.setHours(23, 59, 59, 999);
        filter.date.$lte = endDate;
      }
    }

    // Get all distinct dates with transfers (sorted descending)
    const allTransfers = await Transfer.find(filter).sort({ date: -1 }).select('date');
    
    // Group by date (YYYY-MM-DD format)
    const dateGroups = {};
    allTransfers.forEach(t => {
      const dateKey = new Date(t.date).toISOString().split('T')[0];
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = true;
      }
    });
    
    const uniqueDates = Object.keys(dateGroups).sort().reverse(); // Most recent first
    const totalPages = uniqueDates.length || 1;
    
    if (page > totalPages) {
      return res.json({
        data: [],
        total: 0,
        page,
        pageSize: 0,
        totalPages,
        currentDate: null,
        hasNext: false,
        hasPrev: false
      });
    }

    // Get the date for current page
    const currentDate = uniqueDates[page - 1];
    
    if (!currentDate) {
      return res.json({
        data: [],
        total: 0,
        page,
        pageSize: 0,
        totalPages,
        currentDate: null,
        hasNext: false,
        hasPrev: false
      });
    }

    // Get all transfers for this specific date
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const dayFilter = {
      ...filter,
      date: {
        ...filter.date,
        $gte: startOfDay,
        $lte: endOfDay
      }
    };

    const transfers = await Transfer.find(dayFilter)
      .sort({ date: -1 })
      .populate('items.item')
      .populate('technician');

    res.json({
      data: transfers,
      total: transfers.length,
      page,
      pageSize: transfers.length,
      totalPages,
      currentDate,
      hasNext: page < totalPages,
      hasPrev: page > 1
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helpers
const getModel = (loc) => (loc === 'warehouse' ? Warehouse : loc === 'store' ? Store : Store2);
const getQtyField = (loc) => (loc === 'warehouse' ? 'quantity' : 'remaining_quantity');

export const createTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { error } = transferSchema.validate(req.body);
    if (error) {
      let friendlyMessage = error.details[0].message;
      if (error.details[0].path.includes('items')) {
        friendlyMessage = '❌ Please add at least one item to the transfer with a valid quantity (minimum 1).';
      } else if (error.details[0].path.includes('from')) {
        friendlyMessage = '❌ Source location is required. Please select where to transfer items from (Warehouse, Store, or Store2).';
      } else if (error.details[0].path.includes('to')) {
        friendlyMessage = '❌ Destination location is required. Please select where to transfer items to (Warehouse, Store, or Store2).';
      } else if (error.details[0].path.includes('quantity')) {
        friendlyMessage = '❌ Quantity must be at least 1 for all items in the transfer.';
      }
      return res.status(400).json({ error: friendlyMessage });
    }
    const { items, from, to, technician, workType } = req.body;
    if (from === to) return res.status(400).json({ error: '❌ Cannot create transfer: Source and destination locations must be different. Please select different locations for "From" and "To".' });

    // Convert empty string workType to undefined
    const cleanWorkType = workType === '' ? undefined : workType;
    const cleanTechnician = technician === '' ? undefined : technician;

    let transfer;

    await session.withTransaction(async () => {
      // STEP 1: Check ALL items have sufficient stock BEFORE making any changes
      const stockChecks = [];
      for (const { item, quantity } of items) {
        const FromModel = getModel(from);
        const fromDoc = await FromModel.findOne({ item }).session(session);
        const fromQty = fromDoc ? (from === 'warehouse' ? fromDoc.quantity : fromDoc.remaining_quantity) : 0;
        
        if (!fromDoc || fromQty < quantity) {
          const itemDoc = await Item.findById(item).session(session);
          const itemName = itemDoc ? itemDoc.name : item;
          throw new Error(`❌ Cannot create transfer: Not enough stock in ${from.toUpperCase()} for item "${itemName}". You are trying to transfer ${quantity} units but only ${fromQty} units are available. Please check the inventory and adjust the quantity.`);
        }
        
        stockChecks.push({ fromDoc, item, quantity });
      }

      // STEP 2: If all checks pass, perform ALL transfers
      for (const { fromDoc, item, quantity } of stockChecks) {
        const ToModel = getModel(to);
        let toDoc = await ToModel.findOne({ item }).session(session);

        // Deduct from source
        if (from === 'warehouse') {
          fromDoc.quantity -= quantity;
        } else {
          fromDoc.remaining_quantity -= quantity;
        }
        await fromDoc.save({ session });

        // Remove from source boxes using FIFO
        await removeFromBoxesFIFO(item, quantity, from, session);

        // Add to destination
        if (toDoc) {
          if (to === 'warehouse') {
            toDoc.quantity += quantity;
          } else {
            toDoc.remaining_quantity += quantity;
          }
          await toDoc.save({ session });
        } else {
          if (to === 'warehouse') {
            await Warehouse.create([{ item, quantity }], { session });
          } else if (to === 'store') {
            await Store.create([{ item, remaining_quantity: quantity }], { session });
          } else if (to === 'store2') {
            await Store2.create([{ item, remaining_quantity: quantity }], { session });
          }
        }

        // Add to destination boxes
        await addToBoxes(item, quantity, to, session);
      }

      // STEP 3: Save the transfer record
      console.log('🔄 Creating transfer with:', { 
        items: items.length, 
        from, 
        to, 
        technician: cleanTechnician, 
        workType: cleanWorkType,
        workTypeType: typeof cleanWorkType,
        isEmpty: cleanWorkType === '',
        isUndefined: cleanWorkType === undefined,
        isNull: cleanWorkType === null
      });
      
      transfer = new Transfer({ items, from, to, technician: cleanTechnician, workType: cleanWorkType });
      await transfer.save({ session });
      
      console.log('✅ Transfer saved:', {
        id: transfer._id,
        workType: transfer.workType,
        workTypeInDB: typeof transfer.workType
      });
    });

    res.status(201).json(transfer);
  } catch (err) {
    let friendlyError = err.message;
    if (err.message.includes('validation')) {
      friendlyError = `❌ Validation error: ${err.message}. Please check all fields and ensure quantities are valid positive numbers.`;
    } else if (err.message.includes('network') || err.message.includes('connection')) {
      friendlyError = '❌ Cannot create transfer: Network connection issue. Please check your internet connection and try again.';
    } else if (!err.message.includes('❌')) {
      friendlyError = `❌ Cannot create transfer: ${err.message}`;
    }
    res.status(500).json({ error: friendlyError });
  } finally {
    session.endSession();
  }
};

// Update transfer
export const updateTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { error } = transferSchema.validate(req.body);
    if (error) {
      let friendlyMessage = error.details[0].message;
      if (error.details[0].path.includes('items')) {
        friendlyMessage = '❌ Please add at least one item to the transfer with a valid quantity (minimum 1).';
      } else if (error.details[0].path.includes('from')) {
        friendlyMessage = '❌ Source location is required. Please select where to transfer items from (Warehouse, Store, or Store2).';
      } else if (error.details[0].path.includes('to')) {
        friendlyMessage = '❌ Destination location is required. Please select where to transfer items to (Warehouse, Store, or Store2).';
      } else if (error.details[0].path.includes('quantity')) {
        friendlyMessage = '❌ Quantity must be at least 1 for all items in the transfer.';
      }
      return res.status(400).json({ error: friendlyMessage });
    }
    const { items, from, to, technician, workType } = req.body;
    
    // Convert empty string workType to undefined
    const cleanWorkType = workType === '' ? undefined : workType;
    const cleanTechnician = technician === '' ? undefined : technician;
    
    const transfer = await Transfer.findById(req.params.id).session(session);
    if (!transfer) return res.status(404).json({ error: '❌ Cannot update transfer: The transfer record was not found in the system. It may have been deleted or the ID is incorrect.' });

    let updatedTransfer;

    await session.withTransaction(async () => {
      // 1) Revert previous inventory effects (including boxes)
      for (const prev of transfer.items) {
        const FromModelPrev = getModel(transfer.from);
        const ToModelPrev = getModel(transfer.to);
        const fromFieldPrev = getQtyField(transfer.from);
        const toFieldPrev = getQtyField(transfer.to);

        let fromDocPrev = await FromModelPrev.findOne({ item: prev.item }).session(session);
        let toDocPrev = await ToModelPrev.findOne({ item: prev.item }).session(session);

        // Add back to source inventory
        if (fromDocPrev) {
          fromDocPrev[fromFieldPrev] = (fromDocPrev[fromFieldPrev] || 0) + prev.quantity;
          await fromDocPrev.save({ session });
        } else {
          // If missing, create with reverted qty
          const payload = { item: prev.item };
          payload[fromFieldPrev] = prev.quantity;
          await getModel(transfer.from).create([payload], { session });
        }

        // Add back to source boxes
        await addToBoxes(prev.item, prev.quantity, transfer.from, session);

        // Subtract from destination inventory
        if (toDocPrev) {
          toDocPrev[toFieldPrev] = Math.max(0, (toDocPrev[toFieldPrev] || 0) - prev.quantity);
          await toDocPrev.save({ session });
        }

        // Remove from destination boxes
        await removeFromBoxesFIFO(prev.item, prev.quantity, transfer.to, session);
      }

      // 2) Check ALL new items have sufficient stock BEFORE making any changes
      const stockChecks = [];
      for (const { item, quantity } of items) {
        const FromModel = getModel(from);
        const fromDoc = await FromModel.findOne({ item }).session(session);
        const fromQty = fromDoc ? (from === 'warehouse' ? fromDoc.quantity : fromDoc.remaining_quantity) : 0;
        
        if (!fromDoc || fromQty < quantity) {
          const itemDoc = await Item.findById(item).session(session);
          const itemName = itemDoc ? itemDoc.name : item;
          throw new Error(`❌ Cannot update transfer: Not enough stock in ${from.toUpperCase()} for item "${itemName}". You are trying to transfer ${quantity} units but only ${fromQty} units are available. Please check the inventory and adjust the quantity.`);
        }
        
        stockChecks.push({ fromDoc, item, quantity });
      }

      // 3) Apply new transfer (including boxes)
      for (const { fromDoc, item, quantity } of stockChecks) {
        const ToModel = getModel(to);
        let toDoc = await ToModel.findOne({ item }).session(session);

        // Deduct from source inventory
        if (from === 'warehouse') {
          fromDoc.quantity -= quantity;
        } else {
          fromDoc.remaining_quantity -= quantity;
        }
        await fromDoc.save({ session });

        // Remove from source boxes using FIFO
        await removeFromBoxesFIFO(item, quantity, from, session);

        // Add to destination inventory
        if (toDoc) {
          if (to === 'warehouse') {
            toDoc.quantity += quantity;
          } else {
            toDoc.remaining_quantity += quantity;
          }
          await toDoc.save({ session });
        } else {
          if (to === 'warehouse') {
            await Warehouse.create([{ item, quantity }], { session });
          } else if (to === 'store') {
            await Store.create([{ item, remaining_quantity: quantity }], { session });
          } else if (to === 'store2') {
            await Store2.create([{ item, remaining_quantity: quantity }], { session });
          }
        }

        // Add to destination boxes
        await addToBoxes(item, quantity, to, session);
      }

      // 4) Update transfer record
      transfer.items = items;
      transfer.from = from;
      transfer.to = to;
      transfer.technician = cleanTechnician;
      transfer.workType = cleanWorkType;
      updatedTransfer = await transfer.save({ session });
    });

    res.json(updatedTransfer);
  } catch (err) {
    let friendlyError = err.message;
    if (err.message.includes('validation')) {
      friendlyError = `❌ Validation error: ${err.message}. Please check all fields and ensure quantities are valid positive numbers.`;
    } else if (err.message.includes('network') || err.message.includes('connection')) {
      friendlyError = '❌ Cannot update transfer: Network connection issue. Please check your internet connection and try again.';
    } else if (!err.message.includes('❌')) {
      friendlyError = `❌ Cannot update transfer: ${err.message}`;
    }
    res.status(500).json({ error: friendlyError });
  } finally {
    session.endSession();
  }
};

// Delete transfer
export const deleteTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ error: '❌ Cannot delete transfer: The transfer record was not found in the system. It may have been already deleted.' });
    await Transfer.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    let friendlyError = err.message;
    if (!err.message.includes('❌')) {
      friendlyError = `❌ Cannot delete transfer: ${err.message}. Please try again or contact support if the problem persists.`;
    }
    res.status(500).json({ error: friendlyError });
  }
};

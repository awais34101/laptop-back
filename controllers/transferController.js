import Transfer from '../models/Transfer.js';
import Warehouse from '../models/Warehouse.js';
import Store from '../models/Store.js';
import Store2 from '../models/Store2.js';
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
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { items, from, to, technician, workType } = req.body;
    if (from === to) return res.status(400).json({ error: 'Source and destination must be different' });

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
          throw new Error(`Not enough stock in ${from} for item ${item}. Available: ${fromQty}, Required: ${quantity}`);
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
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
};

// Update transfer
export const updateTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { error } = transferSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { items, from, to, technician, workType } = req.body;
    
    // Convert empty string workType to undefined
    const cleanWorkType = workType === '' ? undefined : workType;
    const cleanTechnician = technician === '' ? undefined : technician;
    
    const transfer = await Transfer.findById(req.params.id).session(session);
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });

    let updatedTransfer;

    await session.withTransaction(async () => {
      // 1) Revert previous inventory effects
      for (const prev of transfer.items) {
        const FromModelPrev = getModel(transfer.from);
        const ToModelPrev = getModel(transfer.to);
        const fromFieldPrev = getQtyField(transfer.from);
        const toFieldPrev = getQtyField(transfer.to);

        let fromDocPrev = await FromModelPrev.findOne({ item: prev.item }).session(session);
        let toDocPrev = await ToModelPrev.findOne({ item: prev.item }).session(session);

        // Add back to source
        if (fromDocPrev) {
          fromDocPrev[fromFieldPrev] = (fromDocPrev[fromFieldPrev] || 0) + prev.quantity;
          await fromDocPrev.save({ session });
        } else {
          // If missing, create with reverted qty
          const payload = { item: prev.item };
          payload[fromFieldPrev] = prev.quantity;
          await getModel(transfer.from).create([payload], { session });
        }
        // Subtract from destination
        if (toDocPrev) {
          toDocPrev[toFieldPrev] = Math.max(0, (toDocPrev[toFieldPrev] || 0) - prev.quantity);
          await toDocPrev.save({ session });
        }
      }

      // 2) Check ALL new items have sufficient stock BEFORE making any changes
      const stockChecks = [];
      for (const { item, quantity } of items) {
        const FromModel = getModel(from);
        const fromDoc = await FromModel.findOne({ item }).session(session);
        const fromQty = fromDoc ? (from === 'warehouse' ? fromDoc.quantity : fromDoc.remaining_quantity) : 0;
        
        if (!fromDoc || fromQty < quantity) {
          throw new Error(`Not enough stock in ${from} for item ${item}. Available: ${fromQty}, Required: ${quantity}`);
        }
        
        stockChecks.push({ fromDoc, item, quantity });
      }

      // 3) Apply new transfer
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
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
};

// Delete transfer
export const deleteTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
    await Transfer.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a purchase invoice
export const deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findByIdAndDelete(req.params.id);
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
    // Optionally, you can also update warehouse stock here if needed
    res.json({ message: 'Purchase deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
export const updatePurchase = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { error } = purchaseSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { items, supplier, invoice_number } = req.body;
    const purchase = await Purchase.findById(req.params.id).session(session);
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
  // Prevent duplicate invoice for same supplier (excluding current doc)
  const dup = await Purchase.exists({ supplier, invoice_number, _id: { $ne: purchase._id } });
  if (dup) return res.status(409).json({ error: 'Duplicate invoice: this supplier already has an invoice with the same number.' });

    await session.withTransaction(async () => {
      // 1. Reverse previous warehouse stock for each item in the old purchase
      for (const prev of purchase.items) {
        const warehouse = await Warehouse.findOne({ item: prev.item }).session(session);
        if (warehouse) {
          warehouse.quantity -= prev.quantity;
          if (warehouse.quantity < 0) warehouse.quantity = 0;
          await warehouse.save({ session });
        }
      }

      // 2. Update warehouse stock for new items
      for (const { item, quantity, price } of items) {
        const itemDoc = await Item.findById(item).session(session);
        if (!itemDoc) throw new Error(`Item not found: ${item}`);
        // Compute current on-hand across Warehouse, Store, Store2 BEFORE adding new qty
        const [whDoc, storeDoc, store2Doc] = await Promise.all([
          Warehouse.findOne({ item }).session(session),
          Store.findOne({ item }).session(session),
          Store2.findOne({ item }).session(session)
        ]);

        const currentTotalQty = (whDoc?.quantity || 0) + (storeDoc?.remaining_quantity || 0) + (store2Doc?.remaining_quantity || 0);
        const currentAvg = itemDoc.average_price || 0;

        const denominator = currentTotalQty + quantity;
        const newAvg = denominator > 0 ? ((currentTotalQty * currentAvg) + (quantity * price)) / denominator : price;
        itemDoc.average_price = newAvg;
        await itemDoc.save({ session });

        // Then add new qty to Warehouse
        if (whDoc) {
          whDoc.quantity += quantity;
          await whDoc.save({ session });
        } else {
          await Warehouse.create([{ item, quantity }], { session });
        }
      }

      purchase.items = items;
      purchase.supplier = supplier;
      purchase.invoice_number = invoice_number;
      await purchase.save({ session });
      res.json(purchase);
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate invoice: this supplier already has an invoice with the same number.' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
};
import mongoose from 'mongoose';
import Purchase from '../models/Purchase.js';
import Item from '../models/Item.js';
import Warehouse from '../models/Warehouse.js';
import Store from '../models/Store.js';
import Store2 from '../models/Store2.js';
import SheetAssignment from '../models/SheetAssignment.js';
import Technician from '../models/Technician.js';
import Transfer from '../models/Transfer.js';
import Joi from 'joi';


const purchaseItemSchema = Joi.object({
  item: Joi.string().required(),
  quantity: Joi.number().min(1).required(),
  price: Joi.number().min(0).required(),
});

const purchaseSchema = Joi.object({
  items: Joi.array().items(purchaseItemSchema).min(1).required(),
  supplier: Joi.string().required(),
  invoice_number: Joi.string().required(),
});

export const getPurchases = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const [total, purchases] = await Promise.all([
      Purchase.countDocuments(),
      Purchase.find()
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.item')
    ]);

    res.json({
      data: purchases,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------- Sheet progress helpers ----------------
const computeSheetProgress = async (purchaseId) => {
  const purchase = await Purchase.findById(purchaseId).populate('items.item', 'name sku');
  if (!purchase) return null;
  const transfers = await Transfer.find({ purchaseId }).select('items');
  const transferredByItem = new Map();
  for (const tr of transfers) {
    for (const it of tr.items) {
      const key = String(it.item);
      transferredByItem.set(key, (transferredByItem.get(key) || 0) + (it.quantity || 0));
    }
  }
  
  let totalPurchased = 0;
  let totalTransferred = 0;
  
  const items = purchase.items.map(it => {
    const purchased = it.quantity || 0;
    const transferred = transferredByItem.get(String(it.item._id || it.item)) || 0;
    const remaining = Math.max(0, purchased - transferred);
    const transferPercentage = purchased > 0 ? Math.round((transferred / purchased) * 100) : 0;
    
    totalPurchased += purchased;
    totalTransferred += transferred;
    
    return {
      item: it.item,
      purchased,
      transferred,
      remaining,
      transferPercentage
    };
  });
  
  const allRemaining = items.reduce((s, x) => s + x.remaining, 0);
  const overallTransferPercentage = totalPurchased > 0 ? Math.round((totalTransferred / totalPurchased) * 100) : 0;
  
  return { 
    purchaseId, 
    items, 
    isCompleted: allRemaining === 0,
    totalPurchased,
    totalTransferred,
    totalRemaining: allRemaining,
    overallTransferPercentage
  };
};

export const createPurchase = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { error } = purchaseSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { items, supplier, invoice_number } = req.body;
  // Prevent duplicate invoice for same supplier
  const dup = await Purchase.exists({ supplier, invoice_number });
  if (dup) return res.status(409).json({ error: 'Duplicate invoice: this supplier already has an invoice with the same number.' });

    let createdPurchase;
    await session.withTransaction(async () => {
      // Process each item in the purchase
      for (const { item, quantity, price } of items) {
        const itemDoc = await Item.findById(item).session(session);
        if (!itemDoc) throw new Error(`Item not found: ${item}`);
        // Compute total on-hand across Warehouse + Store + Store2 BEFORE adding new qty
        const [whDoc, storeDoc, store2Doc] = await Promise.all([
          Warehouse.findOne({ item }).session(session),
          Store.findOne({ item }).session(session),
          Store2.findOne({ item }).session(session)
        ]);

        const currentTotalQty = (whDoc?.quantity || 0) + (storeDoc?.remaining_quantity || 0) + (store2Doc?.remaining_quantity || 0);
        const currentAvg = itemDoc.average_price || 0;

        // Weighted average cost
        const denominator = currentTotalQty + quantity;
        const newAvg = denominator > 0 ? ((currentTotalQty * currentAvg) + (quantity * price)) / denominator : price;

        // Persist new average first
        itemDoc.average_price = newAvg;
        await itemDoc.save({ session });

        // Then update/add to Warehouse quantity
        if (whDoc) {
          whDoc.quantity += quantity;
          await whDoc.save({ session });
        } else {
          await Warehouse.create([{ item, quantity }], { session });
        }
      }
      // Save the purchase document
      createdPurchase = new Purchase({ items, supplier, invoice_number });
      await createdPurchase.save({ session });
    });

    res.status(201).json(createdPurchase);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate invoice: this supplier already has an invoice with the same number.' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
};

// Get purchase sheets without price information for staff verification
export const getPurchaseSheets = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim() || '';
    const technicianFilter = req.query.technician?.trim() || '';
    const statusFilter = req.query.status?.trim() || '';

    // Build search filter (only by invoice number since supplier is hidden)
    let filter = {};
    if (search) {
      filter = {
        invoice_number: new RegExp(search, 'i')
      };
    }

    const [total, purchases] = await Promise.all([
      Purchase.countDocuments(filter),
      Purchase.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.item', 'name sku')
        .select('-items.price') // Exclude price information
    ]);

    // Get assignments for these purchases
    const purchaseIds = purchases.map(p => p._id);
    const assignments = await SheetAssignment.find({ 
      purchaseId: { $in: purchaseIds } 
    }).populate('technicianId', 'name');

    // Create assignment lookup
    const assignmentLookup = {};
    assignments.forEach(assignment => {
      assignmentLookup[assignment.purchaseId.toString()] = assignment;
    });

    // Filter by technician if specified
    let filteredPurchases = purchases;
    if (technicianFilter) {
      const technicianAssignments = assignments.filter(a => 
        a.technicianId && a.technicianId._id.toString() === technicianFilter
      );
      const assignedPurchaseIds = technicianAssignments.map(a => a.purchaseId.toString());
      filteredPurchases = purchases.filter(p => 
        assignedPurchaseIds.includes(p._id.toString())
      );
    }

    // Filter by status if specified
    if (statusFilter) {
      if (statusFilter === 'unassigned') {
        filteredPurchases = filteredPurchases.filter(p => 
          !assignmentLookup[p._id.toString()]
        );
      } else {
        const statusAssignments = assignments.filter(a => a.status === statusFilter);
        const statusPurchaseIds = statusAssignments.map(a => a.purchaseId.toString());
        filteredPurchases = filteredPurchases.filter(p => 
          statusPurchaseIds.includes(p._id.toString())
        );
      }
    }

    // Transform data to remove any price fields and supplier info that might leak
    const sheetsData = await Promise.all(filteredPurchases.map(async purchase => {
      const assignment = assignmentLookup[purchase._id.toString()];
      const progress = await computeSheetProgress(purchase._id);
      return {
        _id: purchase._id,
        // supplier: purchase.supplier, // Hidden for security
        invoice_number: purchase.invoice_number,
        date: purchase.date,
        items: purchase.items.map(item => ({
          item: item.item,
          quantity: item.quantity,
          // Explicitly exclude price
        })),
        assignment: assignment ? {
          _id: assignment._id,
          technician: assignment.technicianId,
          status: assignment.status,
          assignedAt: assignment.assignedAt,
          notes: assignment.notes,
          completedAt: assignment.completedAt
        } : null,
        progress: progress ? progress.items : [],
        transferPercentage: progress ? progress.overallTransferPercentage : 0,
        totalPurchased: progress ? progress.totalPurchased : 0,
        totalTransferred: progress ? progress.totalTransferred : 0,
        totalRemaining: progress ? progress.totalRemaining : 0
      };
    }));

    res.json({
      data: sheetsData,
      total: filteredPurchases.length,
      page,
      pageSize: limit,
      totalPages: Math.ceil(filteredPurchases.length / limit) || 1,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Assign a sheet to a technician
export const assignSheet = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { technicianId, notes } = req.body;

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
      return res.status(400).json({ error: 'Invalid purchase ID' });
    }
    if (!mongoose.Types.ObjectId.isValid(technicianId)) {
      return res.status(400).json({ error: 'Invalid technician ID' });
    }

    // Check if purchase exists
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Check if technician exists
    const technician = await Technician.findById(technicianId);
    if (!technician) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    // Check if already assigned
    const existingAssignment = await SheetAssignment.findOne({ purchaseId });
    if (existingAssignment) {
      // Update existing assignment
      existingAssignment.technicianId = technicianId;
      existingAssignment.assignedBy = req.user.userId;
      existingAssignment.assignedAt = new Date();
      existingAssignment.status = 'assigned';
      existingAssignment.notes = notes || '';
      existingAssignment.completedAt = null;
      await existingAssignment.save();

      await existingAssignment.populate('technicianId', 'name');
      res.json(existingAssignment);
    } else {
      // Create new assignment
      const assignment = new SheetAssignment({
        purchaseId,
        technicianId,
        assignedBy: req.user.userId,
        notes: notes || ''
      });

      await assignment.save();
      await assignment.populate('technicianId', 'name');
      res.status(201).json(assignment);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update sheet assignment status
export const updateSheetStatus = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { status, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }

    const validStatuses = ['assigned', 'in-progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const assignment = await SheetAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    assignment.status = status;
    if (notes !== undefined) assignment.notes = notes;
    if (status === 'completed') {
      assignment.completedAt = new Date();
    } else {
      assignment.completedAt = null;
    }

    await assignment.save();
    await assignment.populate('technicianId', 'name');
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a transfer tied to a sheet (Warehouse -> Store or Store2)
export const createSheetTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { purchaseId } = req.params;
    const { destination, items, notes } = req.body; // destination: 'store' | 'store2'

    if (!['store', 'store2'].includes(destination)) {
      return res.status(400).json({ error: 'Destination must be store or store2' });
    }
    if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
      return res.status(400).json({ error: 'Invalid purchase ID' });
    }

    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

    const assignment = await SheetAssignment.findOne({ purchaseId });
    const technicianId = assignment ? assignment.technicianId : undefined;

    // Build purchased quantities map
    const purchasedMap = new Map();
    for (const it of purchase.items) purchasedMap.set(String(it.item), it.quantity);

    // Current transferred per item
    const progress = await computeSheetProgress(purchaseId);
    const transferredMap = new Map();
    if (progress) for (const it of progress.items) transferredMap.set(String(it.item._id || it.item), it.transferred);

    // Validate requested quantities
    for (const row of items) {
      const itemId = String(row.item);
      const purchasedQty = purchasedMap.get(itemId) || 0;
      const transferredQty = transferredMap.get(itemId) || 0;
      const remaining = Math.max(0, purchasedQty - transferredQty);
      if (row.quantity <= 0) return res.status(400).json({ error: 'Quantity must be > 0' });
      if (row.quantity > remaining) {
        return res.status(400).json({ error: `Over-transfer for item ${itemId}. Remaining: ${remaining}` });
      }
    }

    // Check warehouse stock
    for (const row of items) {
      const wh = await Warehouse.findOne({ item: row.item });
      const whQty = wh ? wh.quantity : 0;
      if (!wh || whQty < row.quantity) {
        return res.status(400).json({ error: 'Not enough stock in warehouse' });
      }
    }

    await session.withTransaction(async () => {
      // Move inventory
      for (const row of items) {
        const wh = await Warehouse.findOne({ item: row.item }).session(session);
        wh.quantity -= row.quantity;
        await wh.save({ session });

        if (destination === 'store') {
          const st = await Store.findOne({ item: row.item }).session(session);
          if (st) { st.remaining_quantity += row.quantity; await st.save({ session }); }
          else { await Store.create([{ item: row.item, remaining_quantity: row.quantity }], { session }); }
        } else {
          const st2 = await Store2.findOne({ item: row.item }).session(session);
          if (st2) { st2.remaining_quantity += row.quantity; await st2.save({ session }); }
          else { await Store2.create([{ item: row.item, remaining_quantity: row.quantity }], { session }); }
        }
      }

      // Record transfer entry with linkage to the sheet
      const transfer = new Transfer({
        items,
        from: 'warehouse',
        to: destination,
        technician: technicianId,
        workType: undefined,
        purchaseId,
        assignmentId: assignment?._id,
      });
      await transfer.save({ session });

      // Optional: auto-complete if fully transferred
      const newProgress = await computeSheetProgress(purchaseId);
      if (assignment && newProgress?.isCompleted) {
        assignment.status = 'completed';
        assignment.completedAt = new Date();
        await assignment.save({ session });
      }
    });

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
};

// Public API: get per-sheet progress
export const getSheetProgress = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
      return res.status(400).json({ error: 'Invalid purchase ID' });
    }
    const progress = await computeSheetProgress(purchaseId);
    if (!progress) return res.status(404).json({ error: 'Purchase not found' });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all technicians for assignment dropdown
export const getTechnicians = async (req, res) => {
  try {
    const technicians = await Technician.find({}, 'name email specialization').sort({ name: 1 });
    res.json(technicians);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

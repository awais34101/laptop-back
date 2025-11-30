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
    if (error) {
      let friendlyMessage = error.details[0].message;
      if (error.details[0].path.includes('items')) {
        friendlyMessage = 'Please add at least one item to the purchase invoice with valid quantity and price.';
      } else if (error.details[0].path.includes('supplier')) {
        friendlyMessage = 'Supplier name is required. Please enter the supplier name.';
      } else if (error.details[0].path.includes('invoice_number')) {
        friendlyMessage = 'Invoice number is required. Please enter a unique invoice number.';
      } else if (error.details[0].path.includes('quantity')) {
        friendlyMessage = 'Quantity must be at least 1 for all items.';
      } else if (error.details[0].path.includes('price')) {
        friendlyMessage = 'Price must be 0 or greater for all items.';
      }
      return res.status(400).json({ error: friendlyMessage });
    }
    const { items, supplier, invoice_number } = req.body;
    const purchase = await Purchase.findById(req.params.id).session(session);
    if (!purchase) return res.status(404).json({ error: 'Cannot update purchase invoice: The invoice was not found in the system. It may have been deleted.' });
  // Prevent duplicate invoice for same supplier (excluding current doc)
  const dup = await Purchase.exists({ supplier, invoice_number, _id: { $ne: purchase._id } });
  if (dup) return res.status(409).json({ error: `Cannot update purchase invoice: Another invoice with number "${invoice_number}" already exists for supplier "${supplier}". Please use a different invoice number.` });

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
        if (!itemDoc) throw new Error(`Cannot update purchase invoice: The selected item (ID: ${item}) was not found in the system. Please select a valid item from the dropdown or refresh the page and try again.`);
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
      const invNum = req.body.invoice_number || 'this number';
      const suppName = req.body.supplier || 'this supplier';
      return res.status(409).json({ error: `Cannot update purchase invoice: Invoice number "${invNum}" already exists for supplier "${suppName}". Each supplier must have unique invoice numbers. Please check your records or use a different invoice number.` });
    }
    // Provide more context for other errors
    let friendlyError = err.message;
    if (err.message.includes('validation')) {
      friendlyError = `Validation error: ${err.message}. Please check all fields and ensure quantities are positive numbers and prices are valid.`;
    } else if (err.message.includes('network') || err.message.includes('connection')) {
      friendlyError = 'Cannot update purchase invoice: Network connection issue. Please check your internet connection and try again.';
    } else if (!err.message.includes('Cannot update purchase invoice')) {
      friendlyError = `Cannot update purchase invoice: ${err.message}`;
    }
    res.status(500).json({ error: friendlyError });
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
    if (error) {
      let friendlyMessage = error.details[0].message;
      if (error.details[0].path.includes('items')) {
        friendlyMessage = 'Please add at least one item to the purchase invoice with valid quantity and price.';
      } else if (error.details[0].path.includes('supplier')) {
        friendlyMessage = 'Supplier name is required. Please enter the supplier name.';
      } else if (error.details[0].path.includes('invoice_number')) {
        friendlyMessage = 'Invoice number is required. Please enter a unique invoice number.';
      } else if (error.details[0].path.includes('quantity')) {
        friendlyMessage = 'Quantity must be at least 1 for all items.';
      } else if (error.details[0].path.includes('price')) {
        friendlyMessage = 'Price must be 0 or greater for all items.';
      }
      return res.status(400).json({ error: friendlyMessage });
    }
    const { items, supplier, invoice_number } = req.body;
  // Prevent duplicate invoice for same supplier
  const dup = await Purchase.exists({ supplier, invoice_number });
  if (dup) return res.status(409).json({ error: `Cannot save purchase invoice: A purchase invoice with number "${invoice_number}" already exists for supplier "${supplier}". Please use a different invoice number or check if this invoice was already entered.` });

    let createdPurchase;
    await session.withTransaction(async () => {
      // Process each item in the purchase
      for (const { item, quantity, price } of items) {
        const itemDoc = await Item.findById(item).session(session);
        if (!itemDoc) throw new Error(`Cannot save purchase invoice: The selected item (ID: ${item}) was not found in the system. Please select a valid item from the dropdown or refresh the page and try again.`);
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
      const invNum = req.body.invoice_number || 'this number';
      const suppName = req.body.supplier || 'this supplier';
      return res.status(409).json({ error: `Cannot save purchase invoice: Invoice number "${invNum}" already exists for supplier "${suppName}". Each supplier must have unique invoice numbers. Please check your records or use a different invoice number.` });
    }
    // Provide more context for other errors
    let friendlyError = err.message;
    if (err.message.includes('validation')) {
      friendlyError = `Validation error: ${err.message}. Please check all fields and ensure quantities are positive numbers and prices are valid.`;
    } else if (err.message.includes('network') || err.message.includes('connection')) {
      friendlyError = 'Cannot save purchase invoice: Network connection issue. Please check your internet connection and try again.';
    } else if (!err.message.includes('Cannot save purchase invoice')) {
      friendlyError = `Cannot save purchase invoice: ${err.message}`;
    }
    res.status(500).json({ error: friendlyError });
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

    // Base filter: search only by invoice number (supplier hidden)
    const baseFilter = search ? { invoice_number: new RegExp(search, 'i') } : {};

    // If no technician/status filter, we can paginate directly on purchases
    if (!technicianFilter && !statusFilter) {
      const [total, purchases] = await Promise.all([
        Purchase.countDocuments(baseFilter),
        Purchase.find(baseFilter)
          .sort({ date: -1 })
          .skip(skip)
          .limit(limit)
          .populate('items.item', 'name sku')
          .select('-items.price')
      ]);

      const purchaseIds = purchases.map(p => p._id);
      const assignments = await SheetAssignment.find({ purchaseId: { $in: purchaseIds } })
        .populate('technicianId', 'name');
      const assignmentLookup = {};
      for (const a of assignments) assignmentLookup[a.purchaseId.toString()] = a;

      const sheetsData = await Promise.all(purchases.map(async (purchase) => {
        const assignment = assignmentLookup[purchase._id.toString()];
        const progress = await computeSheetProgress(purchase._id);
        return {
          _id: purchase._id,
          invoice_number: purchase.invoice_number,
          date: purchase.date,
          items: purchase.items.map(item => ({ item: item.item, quantity: item.quantity })),
          assignment: assignment ? {
            _id: assignment._id,
            technician: assignment.technicianId,
            status: assignment.status,
            assignedAt: assignment.assignedAt,
            dueDate: assignment.dueDate,
            notes: assignment.notes,
            completedAt: assignment.completedAt,
          } : null,
          progress: progress ? progress.items : [],
          transferPercentage: progress ? progress.overallTransferPercentage : 0,
          totalPurchased: progress ? progress.totalPurchased : 0,
          totalTransferred: progress ? progress.totalTransferred : 0,
          totalRemaining: progress ? progress.totalRemaining : 0,
        };
      }));

      return res.json({
        data: sheetsData,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit) || 1,
      });
    }

    // When technician/status filters are applied, determine matching purchase IDs first,
    // then paginate those IDs to ensure accurate counts and pages.
    const baseIdsOrdered = (await Purchase.find(baseFilter).sort({ date: -1 }).select('_id').lean())
      .map(d => d._id.toString());

    let matchedIdsSet = new Set(baseIdsOrdered);

    // If status is 'unassigned', exclude any purchases that have an assignment
    if (statusFilter === 'unassigned') {
      const assigned = await SheetAssignment.find({ purchaseId: { $in: Array.from(matchedIdsSet) } })
        .select('purchaseId').lean();
      const assignedSet = new Set(assigned.map(a => a.purchaseId.toString()));
      matchedIdsSet = new Set(baseIdsOrdered.filter(id => !assignedSet.has(id)));
    } else {
      // Build assignment query within the base set
      const aQuery = { purchaseId: { $in: baseIdsOrdered } };
      if (technicianFilter) aQuery.technicianId = technicianFilter;
      if (statusFilter) aQuery.status = statusFilter;
      const matches = await SheetAssignment.find(aQuery).select('purchaseId').lean();
      matchedIdsSet = new Set(matches.map(m => m.purchaseId.toString()));
    }

    const matchedIdsOrdered = baseIdsOrdered.filter(id => matchedIdsSet.has(id));
    const total = matchedIdsOrdered.length;
    const pageIds = matchedIdsOrdered.slice(skip, skip + limit);

    const purchases = await Purchase.find({ _id: { $in: pageIds } })
      .populate('items.item', 'name sku')
      .select('-items.price')
      .lean();

    // Keep the original order by date
    purchases.sort((a, b) => pageIds.indexOf(a._id.toString()) - pageIds.indexOf(b._id.toString()));

    const assignments = await SheetAssignment.find({ purchaseId: { $in: pageIds } })
      .populate('technicianId', 'name');
    const assignmentLookup = {};
    for (const a of assignments) assignmentLookup[a.purchaseId.toString()] = a;

    const sheetsData = await Promise.all(purchases.map(async (purchase) => {
      const assignment = assignmentLookup[purchase._id.toString()];
      const progress = await computeSheetProgress(purchase._id);
      return {
        _id: purchase._id,
        invoice_number: purchase.invoice_number,
        date: purchase.date,
        items: purchase.items.map(item => ({ item: item.item, quantity: item.quantity })),
        assignment: assignment ? {
          _id: assignment._id,
          technician: assignment.technicianId,
          status: assignment.status,
          assignedAt: assignment.assignedAt,
          dueDate: assignment.dueDate,
          notes: assignment.notes,
          completedAt: assignment.completedAt,
        } : null,
        progress: progress ? progress.items : [],
        transferPercentage: progress ? progress.overallTransferPercentage : 0,
        totalPurchased: progress ? progress.totalPurchased : 0,
        totalTransferred: progress ? progress.totalTransferred : 0,
        totalRemaining: progress ? progress.totalRemaining : 0,
      };
    }));

    // Calculate aggregate statistics when filtering by technician
    let aggregateStats = null;
    if (technicianFilter && matchedIdsOrdered.length > 0) {
      // Get progress for ALL matched sheets (not just current page)
      const allProgressPromises = matchedIdsOrdered.map(id => computeSheetProgress(id));
      const allProgress = await Promise.all(allProgressPromises);
      
      aggregateStats = {
        totalSheets: matchedIdsOrdered.length,
        totalQuantity: allProgress.reduce((sum, p) => sum + (p?.totalPurchased || 0), 0),
        totalTransferred: allProgress.reduce((sum, p) => sum + (p?.totalTransferred || 0), 0),
        totalBalance: allProgress.reduce((sum, p) => sum + (p?.totalRemaining || 0), 0)
      };
    }

    return res.json({
      data: sheetsData,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit) || 1,
      aggregateStats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Assign a sheet to a technician
export const assignSheet = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { technicianId, notes, dueDate } = req.body;

    console.log('=== BACKEND ASSIGNMENT DEBUG ===');
    console.log('Request body:', req.body);
    console.log('dueDate received:', dueDate);
    console.log('dueDate type:', typeof dueDate);
    console.log('================================');

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
      existingAssignment.dueDate = dueDate || null;
      existingAssignment.completedAt = null;
      await existingAssignment.save();

      console.log('Updated assignment:', existingAssignment);
      await existingAssignment.populate('technicianId', 'name');
      res.json(existingAssignment);
    } else {
      // Create new assignment
      const assignment = new SheetAssignment({
        purchaseId,
        technicianId,
        assignedBy: req.user.userId,
        notes: notes || '',
        dueDate: dueDate || null
      });

      await assignment.save();
      console.log('Created new assignment:', assignment);
      await assignment.populate('technicianId', 'name');
      res.status(201).json(assignment);
    }
  } catch (err) {
    console.error('Error in assignSheet:', err);
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
    const { destination, items, notes, workType } = req.body; // destination: 'store' | 'store2', workType: 'repair' | 'test'

    if (!['store', 'store2'].includes(destination)) {
      return res.status(400).json({ error: 'Destination must be store or store2' });
    }
    if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
      return res.status(400).json({ error: 'Invalid purchase ID' });
    }
    
    // Clean workType - convert empty string to undefined
    const cleanWorkType = workType === '' ? undefined : workType;

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
      console.log('📦 Creating sheet transfer with:', {
        items: items.length,
        from: 'warehouse',
        to: destination,
        technician: technicianId,
        workType: cleanWorkType,
        purchaseId,
        assignmentId: assignment?._id
      });
      
      const transfer = new Transfer({
        items,
        from: 'warehouse',
        to: destination,
        technician: technicianId,
        workType: cleanWorkType, // Use workType from request instead of undefined
        purchaseId,
        assignmentId: assignment?._id,
      });
      await transfer.save({ session });
      
      console.log('✅ Sheet transfer saved with workType:', transfer.workType);

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

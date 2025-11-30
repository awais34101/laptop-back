import Settings from '../models/Settings.js';
import Sale from '../models/Sale.js';
import SaleStore2 from '../models/SaleStore2.js';
import Purchase from '../models/Purchase.js';
import Transfer from '../models/Transfer.js';
import { ChecklistCompletion } from '../models/Checklist.js';
import { getDubaiStartOfDayCutoffDaysAgo, formatDubai } from '../utils/dateUtils.js';

export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    settings.low_stock_threshold_warehouse = req.body.low_stock_threshold_warehouse;
    settings.low_stock_threshold_store = req.body.low_stock_threshold_store;
    settings.low_stock_threshold_store2 = req.body.low_stock_threshold_store2;
    settings.slow_moving_days = req.body.slow_moving_days;
    settings.auto_delete_sales_days = req.body.auto_delete_sales_days;
    settings.auto_delete_purchase_days = req.body.auto_delete_purchase_days;
    settings.auto_delete_transfer_days = req.body.auto_delete_transfer_days;
    settings.auto_delete_checklist_days = req.body.auto_delete_checklist_days;
    settings.enable_auto_delete = req.body.enable_auto_delete;
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Auto delete old records based on settings
export const autoDeleteOldRecords = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    if (!settings || !settings.enable_auto_delete) {
      return res.json({ message: 'Auto delete is disabled' });
    }

    const now = new Date();
    let deletedCounts = {
      sales: 0,
      salesStore2: 0,
      purchases: 0,
      transfers: 0,
      checklists: 0
    };

    const salesCutoff = settings.auto_delete_sales_days > 0
      ? getDubaiStartOfDayCutoffDaysAgo(settings.auto_delete_sales_days, now)
      : null;
    const purchaseCutoff = settings.auto_delete_purchase_days > 0
      ? getDubaiStartOfDayCutoffDaysAgo(settings.auto_delete_purchase_days, now)
      : null;
    const transferCutoff = settings.auto_delete_transfer_days > 0
      ? getDubaiStartOfDayCutoffDaysAgo(settings.auto_delete_transfer_days, now)
      : null;
    const checklistCutoff = settings.auto_delete_checklist_days > 0
      ? getDubaiStartOfDayCutoffDaysAgo(settings.auto_delete_checklist_days, now)
      : null;

    console.log('Manual auto-delete cutoffs (UTC/Dubai):', {
      sales: salesCutoff ? { utc: salesCutoff.toISOString(), dubai: formatDubai(salesCutoff) } : null,
      purchases: purchaseCutoff ? { utc: purchaseCutoff.toISOString(), dubai: formatDubai(purchaseCutoff) } : null,
      transfers: transferCutoff ? { utc: transferCutoff.toISOString(), dubai: formatDubai(transferCutoff) } : null,
      checklists: checklistCutoff ? { utc: checklistCutoff.toISOString(), dubai: formatDubai(checklistCutoff) } : null,
    });

    // Delete old sales (Store 1)
    if (salesCutoff) {
      const deletedSales = await Sale.deleteMany({ date: { $lt: salesCutoff } });
      deletedCounts.sales = deletedSales.deletedCount;
    }

    // Delete old sales (Store 2)
    if (salesCutoff) {
      const deletedSalesStore2 = await SaleStore2.deleteMany({ date: { $lt: salesCutoff } });
      deletedCounts.salesStore2 = deletedSalesStore2.deletedCount;
    }

    // Delete old purchases
    if (purchaseCutoff) {
      const deletedPurchases = await Purchase.deleteMany({ date: { $lt: purchaseCutoff } });
      deletedCounts.purchases = deletedPurchases.deletedCount;
    }

    // Delete old transfers
    if (transferCutoff) {
      const deletedTransfers = await Transfer.deleteMany({ date: { $lt: transferCutoff } });
      deletedCounts.transfers = deletedTransfers.deletedCount;
    }

    // Delete old checklist completions
    if (checklistCutoff) {
      const deletedChecklists = await ChecklistCompletion.deleteMany({ 
        completedAt: { $lt: checklistCutoff } 
      });
      deletedCounts.checklists = deletedChecklists.deletedCount;
    }

    res.json({
      message: 'Auto delete completed',
      deleted: deletedCounts,
      cutoffDates: {
        sales: salesCutoff,
        purchases: purchaseCutoff,
        transfers: transferCutoff,
        checklists: checklistCutoff,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

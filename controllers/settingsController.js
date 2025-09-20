import Settings from '../models/Settings.js';
import Sale from '../models/Sale.js';
import SaleStore2 from '../models/SaleStore2.js';
import Purchase from '../models/Purchase.js';
import Transfer from '../models/Transfer.js';

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
    settings.low_stock_days = req.body.low_stock_days;
    settings.slow_moving_days = req.body.slow_moving_days;
    settings.auto_delete_sales_days = req.body.auto_delete_sales_days;
    settings.auto_delete_purchase_days = req.body.auto_delete_purchase_days;
    settings.auto_delete_transfer_days = req.body.auto_delete_transfer_days;
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
      transfers: 0
    };

    // Delete old sales (Store 1)
    if (settings.auto_delete_sales_days > 0) {
      const salesCutoff = new Date(now.getTime() - (settings.auto_delete_sales_days * 24 * 60 * 60 * 1000));
      const deletedSales = await Sale.deleteMany({ date: { $lt: salesCutoff } });
      deletedCounts.sales = deletedSales.deletedCount;
    }

    // Delete old sales (Store 2)
    if (settings.auto_delete_sales_days > 0) {
      const salesCutoff = new Date(now.getTime() - (settings.auto_delete_sales_days * 24 * 60 * 60 * 1000));
      const deletedSalesStore2 = await SaleStore2.deleteMany({ date: { $lt: salesCutoff } });
      deletedCounts.salesStore2 = deletedSalesStore2.deletedCount;
    }

    // Delete old purchases
    if (settings.auto_delete_purchase_days > 0) {
      const purchaseCutoff = new Date(now.getTime() - (settings.auto_delete_purchase_days * 24 * 60 * 60 * 1000));
      const deletedPurchases = await Purchase.deleteMany({ date: { $lt: purchaseCutoff } });
      deletedCounts.purchases = deletedPurchases.deletedCount;
    }

    // Delete old transfers
    if (settings.auto_delete_transfer_days > 0) {
      const transferCutoff = new Date(now.getTime() - (settings.auto_delete_transfer_days * 24 * 60 * 60 * 1000));
      const deletedTransfers = await Transfer.deleteMany({ date: { $lt: transferCutoff } });
      deletedCounts.transfers = deletedTransfers.deletedCount;
    }

    res.json({
      message: 'Auto delete completed',
      deleted: deletedCounts,
      cutoffDates: {
        sales: settings.auto_delete_sales_days > 0 ? new Date(now.getTime() - (settings.auto_delete_sales_days * 24 * 60 * 60 * 1000)) : null,
        purchases: settings.auto_delete_purchase_days > 0 ? new Date(now.getTime() - (settings.auto_delete_purchase_days * 24 * 60 * 60 * 1000)) : null,
        transfers: settings.auto_delete_transfer_days > 0 ? new Date(now.getTime() - (settings.auto_delete_transfer_days * 24 * 60 * 60 * 1000)) : null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

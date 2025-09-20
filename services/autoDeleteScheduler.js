import cron from 'node-cron';
import Settings from '../models/Settings.js';
import Sale from '../models/Sale.js';
import SaleStore2 from '../models/SaleStore2.js';
import Purchase from '../models/Purchase.js';
import Transfer from '../models/Transfer.js';

// Run auto delete every day at 2:00 AM
export const startAutoDeleteScheduler = () => {
  console.log('Starting auto delete scheduler...');
  
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('Running scheduled auto delete...');
      
      const settings = await Settings.findOne();
      if (!settings || !settings.enable_auto_delete) {
        console.log('Auto delete is disabled, skipping...');
        return;
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

      console.log('Scheduled auto delete completed:', deletedCounts);

    } catch (error) {
      console.error('Scheduled auto delete failed:', error);
    }
  });
};

// Function to stop the scheduler (if needed)
export const stopAutoDeleteScheduler = () => {
  console.log('Stopping auto delete scheduler...');
  cron.destroy();
};
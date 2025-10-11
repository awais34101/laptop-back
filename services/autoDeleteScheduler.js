import cron from 'node-cron';
import Settings from '../models/Settings.js';
import Sale from '../models/Sale.js';
import SaleStore2 from '../models/SaleStore2.js';
import Purchase from '../models/Purchase.js';
import Transfer from '../models/Transfer.js';
import { ChecklistCompletion } from '../models/Checklist.js';
import { DUBAI_TZ, getDubaiStartOfDayCutoffDaysAgo, formatDubai } from '../utils/dateUtils.js';

// Run auto delete every day at 2:00 AM
export const startAutoDeleteScheduler = () => {
  console.log('Starting auto delete scheduler...');
  
  // Run at 02:00 Dubai local time daily
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
        transfers: 0,
        checklists: 0
      };

      // Precompute cutoffs at Dubai start-of-day to avoid partial-day early deletions
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

      console.log('Auto-delete cutoffs (UTC/Dubai):', {
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

      console.log('Scheduled auto delete completed:', deletedCounts);

    } catch (error) {
      console.error('Scheduled auto delete failed:', error);
    }
  }, { timezone: DUBAI_TZ });
};

// Function to stop the scheduler (if needed)
export const stopAutoDeleteScheduler = () => {
  console.log('Stopping auto delete scheduler...');
  cron.destroy();
};
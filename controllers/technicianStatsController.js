import Technician from '../models/Technician.js';
import Transfer from '../models/Transfer.js';

export const getTechnicianStats = async (req, res) => {
  try {
    const { from, to } = req.query;
    
    // Build date filter for transfers
    const transferFilter = {};
    if (from || to) {
      transferFilter.date = {};
      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        transferFilter.date.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        transferFilter.date.$lte = toDate;
      }
    }

    console.log('📅 Date Filter:', { from, to, transferFilter });

    // Get all technicians
    const technicians = await Technician.find();
    
    // Calculate stats for each technician
    const statsPromises = technicians.map(async (technician) => {
      const filter = { ...transferFilter, technician: technician._id };
      const transfers = await Transfer.find(filter);
      
      console.log(`👨‍🔧 ${technician.name} - Found ${transfers.length} transfers`);
      
      let repair = 0;
      let test = 0;
      let regularTransfers = 0; // Transfers WITHOUT sheet
      let sheetTransfers = 0;   // Transfers WITH sheet
      
      transfers.forEach(transfer => {
        let quantity = 0;
        if (Array.isArray(transfer.items)) {
          quantity = transfer.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        }
        
        const isSheetTransfer = !!transfer.purchaseId;
        
        console.log(`  Transfer ID: ${transfer._id}`);
        console.log(`    Date: ${transfer.date}`);
        console.log(`    WorkType: "${transfer.workType}" (type: ${typeof transfer.workType})`);
        console.log(`    Quantity: ${quantity}`);
        console.log(`    From: ${transfer.from} → To: ${transfer.to}`);
        console.log(`    Is Sheet Transfer: ${isSheetTransfer}`);
        
        // Count by workType (repair/test)
        if (transfer.workType === 'repair') {
          repair += quantity;
          console.log(`    ✅ Added to REPAIR: ${quantity}`);
        } else if (transfer.workType === 'test') {
          test += quantity;
          console.log(`    ✅ Added to TEST: ${quantity}`);
        }
        
        // Count by transfer type (regular/sheet)
        if (isSheetTransfer) {
          sheetTransfers += quantity;
          console.log(`    📦 Added to SHEET TRANSFERS: ${quantity}`);
        } else {
          regularTransfers += quantity;
          console.log(`    📋 Added to REGULAR TRANSFERS: ${quantity}`);
        }
      });
      
      // Total is the sum of regular and sheet transfers (counted once)
      const total = regularTransfers + sheetTransfers;
      
      // Calculate how many PCs don't have workType specified
      const withoutWorkType = total - (repair + test);
      
      console.log(`📊 ${technician.name} Summary:`, {
        total,
        repair,
        test,
        withoutWorkType,
        regularTransfers,
        sheetTransfers,
        check: `${repair} + ${test} + ${withoutWorkType} = ${repair + test + withoutWorkType} (should equal ${total})`
      });
      
      return {
        _id: technician._id,
        name: technician.name,
        email: technician.email,
        phone: technician.phone,
        specialization: technician.specialization,
        repair,              // Total repairs (regular + sheet)
        test,                // Total tests (regular + sheet)
        regularTransfers,    // Transfers without sheet selection
        sheetTransfers,      // Transfers with sheet selection
        withoutWorkType,     // Transfers without repair/test specified
        total                // Total PCs transferred (regularTransfers + sheetTransfers)
      };
    });

    const stats = await Promise.all(statsPromises);
    console.log('📊 Final Stats:', stats);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

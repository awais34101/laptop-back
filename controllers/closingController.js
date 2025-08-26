// backend/controllers/closingController.js

import Sale from '../models/Sale.js';
import SaleStore2 from '../models/SaleStore2.js';
import ReturnStore from '../models/ReturnStore.js';
import ReturnStore2 from '../models/ReturnStore2.js';
import ExpenseStore from '../models/ExpenseStore.js';
import ExpenseStore2 from '../models/ExpenseStore2.js';

// storeType: 'store' or 'store2'
const getClosingSummary = async (req, res) => {
  try {
    const { date, storeType } = req.params;
    // Calculate start and end of the day
    const start = new Date(date);
    start.setHours(0,0,0,0);
    const end = new Date(date);
    end.setHours(23,59,59,999);
    let totalSale = 0, totalReturn = 0, totalExpense = 0;
    if (storeType === 'store') {
      totalSale = await Sale.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } }
      ]);
      totalReturn = await ReturnStore.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } }
      ]);
      totalExpense = await ExpenseStore.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: "$items.amount" } } }
      ]);
    } else if (storeType === 'store2') {
      totalSale = await SaleStore2.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } }
      ]);
      totalReturn = await ReturnStore2.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } }
      ]);
      totalExpense = await ExpenseStore2.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: "$items.amount" } } }
      ]);
    } else {
      return res.status(400).json({ error: 'Invalid store type' });
    }
    const sale = totalSale[0]?.total || 0;
    const ret = totalReturn[0]?.total || 0;
    const exp = totalExpense[0]?.total || 0;
    const cashInHand = sale - ret - exp;
    res.json({
      date,
      storeType,
      totalSale: sale,
      totalReturn: ret,
      totalExpense: exp,
      cashInHand
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }

};

export default {
  getClosingSummary
};

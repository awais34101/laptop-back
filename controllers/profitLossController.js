import Sale from '../models/Sale.js';
import SaleStore2 from '../models/SaleStore2.js';
import Purchase from '../models/Purchase.js';
import Item from '../models/Item.js';
import ExpenseStore from '../models/ExpenseStore.js';
import ExpenseStore2 from '../models/ExpenseStore2.js';

/**
 * Calculate profit/loss for Store 1
 * Compares sale prices vs purchase prices for each item sold
 */
export const getStore1ProfitLoss = async (req, res) => {
  try {
    console.log('getStore1ProfitLoss called');
    const { startDate, endDate, profitType, customerId } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Fetch all sales from Store 1
    const salesQuery = Object.keys(dateFilter).length > 0 
      ? { date: dateFilter } 
      : {};
    
    // Add customer filter if specified
    if (customerId) {
      salesQuery.customer = customerId;
    }
    
    console.log('Fetching Store 1 sales...');
    const sales = await Sale.find(salesQuery)
      .populate('items.item', 'name unit category')
      .populate('customer', 'name')
      .sort({ date: -1 });

    console.log(`Found ${sales.length} Store 1 sales`);

    // Pre-fetch all purchase data at once for better performance
    console.log('Fetching all purchases...');
    const allPurchases = await Purchase.find({});
    
    console.log(`Found ${allPurchases.length} purchases`);
    
    // Build a map of item -> average purchase price
    const itemPurchasePriceMap = new Map();
    
    for (const purchase of allPurchases) {
      for (const purchaseItem of purchase.items) {
        const itemId = purchaseItem.item.toString();
        
        if (!itemPurchasePriceMap.has(itemId)) {
          itemPurchasePriceMap.set(itemId, { totalCost: 0, totalQty: 0 });
        }
        
        const data = itemPurchasePriceMap.get(itemId);
        data.totalCost += purchaseItem.quantity * purchaseItem.price;
        data.totalQty += purchaseItem.quantity;
      }
    }

    // Calculate profit/loss for each sale
    const salesWithProfit = [];
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    for (const sale of sales) {
      let saleRevenue = 0;
      let saleCost = 0;
      const itemsDetail = [];

      for (const saleItem of sale.items) {
        if (!saleItem.item) continue; // Skip if item not populated
        
        const itemRevenue = saleItem.quantity * saleItem.price;
        saleRevenue += itemRevenue;

        // Get average purchase price from pre-built map
        const itemId = saleItem.item._id.toString();
        const purchaseData = itemPurchasePriceMap.get(itemId);
        
        const avgPurchasePrice = purchaseData && purchaseData.totalQty > 0
          ? purchaseData.totalCost / purchaseData.totalQty
          : 0;

        const itemCost = saleItem.quantity * avgPurchasePrice;
        const itemProfit = itemRevenue - itemCost;
        saleCost += itemCost;

        itemsDetail.push({
          name: saleItem.item.name,
          quantity: saleItem.quantity,
          salePrice: saleItem.price,
          purchasePrice: avgPurchasePrice,
          revenue: itemRevenue,
          cost: itemCost,
          profit: itemProfit
        });
      }

      const saleProfit = saleRevenue - saleCost;

      totalRevenue += saleRevenue;
      totalCost += saleCost;
      totalProfit += saleProfit;

      salesWithProfit.push({
        _id: sale._id,
        date: sale.date,
        invoice_number: sale.invoice_number,
        customer: sale.customer,
        items: itemsDetail,
        revenue: saleRevenue,
        cost: saleCost,
        profit: saleProfit,
        profitMargin: saleRevenue > 0 ? ((saleProfit / saleRevenue) * 100).toFixed(2) : 0
      });
    }

    // Filter by profit type if specified
    let filteredSales = salesWithProfit;
    if (profitType === 'profit') {
      filteredSales = salesWithProfit.filter(sale => sale.profit > 0);
    } else if (profitType === 'loss') {
      filteredSales = salesWithProfit.filter(sale => sale.profit < 0);
    }

    // Recalculate totals based on filtered sales
    if (profitType) {
      totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.revenue, 0);
      totalCost = filteredSales.reduce((sum, sale) => sum + sale.cost, 0);
      totalProfit = filteredSales.reduce((sum, sale) => sum + sale.profit, 0);
    }

    console.log(`Store 1 calculation complete. Revenue: ${totalRevenue}, Profit: ${totalProfit}`);

    // Fetch expenses for Store 1
    const expensesQuery = Object.keys(dateFilter).length > 0 
      ? { date: dateFilter } 
      : {};
    
    const expenses = await ExpenseStore.find(expensesQuery);
    let totalExpenses = 0;
    
    for (const expense of expenses) {
      for (const item of expense.items) {
        totalExpenses += item.amount;
      }
    }
    
    const netProfit = totalProfit - totalExpenses;

    res.json({
      store: 'Store 1',
      summary: {
        totalRevenue,
        totalCost,
        grossProfit: totalProfit,
        totalExpenses,
        netProfit,
        profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0,
        totalSales: filteredSales.length
      },
      sales: filteredSales
    });
    
    console.log(`Store 1 response sent. Total Revenue: ${totalRevenue.toFixed(2)}, Expenses: ${totalExpenses.toFixed(2)}, Net Profit: ${netProfit.toFixed(2)}`);
  } catch (error) {
    console.error('Error calculating Store 1 profit/loss:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Calculate profit/loss for Store 2
 * Compares sale prices vs purchase prices for each item sold
 */
export const getStore2ProfitLoss = async (req, res) => {
  try {
    const { startDate, endDate, profitType, customerId } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Fetch all sales from Store 2
    const salesQuery = Object.keys(dateFilter).length > 0 
      ? { date: dateFilter } 
      : {};
    
    // Add customer filter if specified
    if (customerId) {
      salesQuery.customer = customerId;
    }
    
    const sales = await SaleStore2.find(salesQuery)
      .populate('items.item', 'name unit category')
      .populate('customer', 'name')
      .sort({ date: -1 });

    // Pre-fetch all purchase data at once for better performance
    const allPurchases = await Purchase.find({});
    
    // Build a map of item -> average purchase price
    const itemPurchasePriceMap = new Map();
    
    for (const purchase of allPurchases) {
      for (const purchaseItem of purchase.items) {
        const itemId = purchaseItem.item.toString();
        
        if (!itemPurchasePriceMap.has(itemId)) {
          itemPurchasePriceMap.set(itemId, { totalCost: 0, totalQty: 0 });
        }
        
        const data = itemPurchasePriceMap.get(itemId);
        data.totalCost += purchaseItem.quantity * purchaseItem.price;
        data.totalQty += purchaseItem.quantity;
      }
    }

    // Calculate profit/loss for each sale
    const salesWithProfit = [];
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    for (const sale of sales) {
      let saleRevenue = 0;
      let saleCost = 0;
      const itemsDetail = [];

      for (const saleItem of sale.items) {
        if (!saleItem.item) continue; // Skip if item not populated
        
        const itemRevenue = saleItem.quantity * saleItem.price;
        saleRevenue += itemRevenue;

        // Get average purchase price from pre-built map
        const itemId = saleItem.item._id.toString();
        const purchaseData = itemPurchasePriceMap.get(itemId);
        
        const avgPurchasePrice = purchaseData && purchaseData.totalQty > 0
          ? purchaseData.totalCost / purchaseData.totalQty
          : 0;

        const itemCost = saleItem.quantity * avgPurchasePrice;
        const itemProfit = itemRevenue - itemCost;
        saleCost += itemCost;

        itemsDetail.push({
          name: saleItem.item.name,
          quantity: saleItem.quantity,
          salePrice: saleItem.price,
          purchasePrice: avgPurchasePrice,
          revenue: itemRevenue,
          cost: itemCost,
          profit: itemProfit
        });
      }

      const saleProfit = saleRevenue - saleCost;

      totalRevenue += saleRevenue;
      totalCost += saleCost;
      totalProfit += saleProfit;

      salesWithProfit.push({
        _id: sale._id,
        date: sale.date,
        invoice_number: sale.invoice_number,
        customer: sale.customer,
        items: itemsDetail,
        revenue: saleRevenue,
        cost: saleCost,
        profit: saleProfit,
        profitMargin: saleRevenue > 0 ? ((saleProfit / saleRevenue) * 100).toFixed(2) : 0
      });
    }

    // Filter by profit type if specified
    let filteredSales = salesWithProfit;
    if (profitType === 'profit') {
      filteredSales = salesWithProfit.filter(sale => sale.profit > 0);
    } else if (profitType === 'loss') {
      filteredSales = salesWithProfit.filter(sale => sale.profit < 0);
    }

    // Recalculate totals based on filtered sales
    if (profitType) {
      totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.revenue, 0);
      totalCost = filteredSales.reduce((sum, sale) => sum + sale.cost, 0);
      totalProfit = filteredSales.reduce((sum, sale) => sum + sale.profit, 0);
    }

    // Fetch expenses for Store 2
    const expensesQuery = Object.keys(dateFilter).length > 0 
      ? { date: dateFilter } 
      : {};
    
    const expenses = await ExpenseStore2.find(expensesQuery);
    let totalExpenses = 0;
    
    for (const expense of expenses) {
      for (const item of expense.items) {
        totalExpenses += item.amount;
      }
    }
    
    const netProfit = totalProfit - totalExpenses;

    res.json({
      store: 'Store 2',
      summary: {
        totalRevenue,
        totalCost,
        grossProfit: totalProfit,
        totalExpenses,
        netProfit,
        profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0,
        totalSales: filteredSales.length
      },
      sales: filteredSales
    });
  } catch (error) {
    console.error('Error calculating Store 2 profit/loss:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get combined profit/loss overview for both stores
 */
export const getCombinedProfitLoss = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const salesQuery = Object.keys(dateFilter).length > 0 
      ? { date: dateFilter } 
      : {};

    // Pre-fetch all purchases once
    const allPurchases = await Purchase.find({});
    
    // Build a map of item -> average purchase price
    const itemPurchasePriceMap = new Map();
    
    for (const purchase of allPurchases) {
      for (const purchaseItem of purchase.items) {
        const itemId = purchaseItem.item.toString();
        
        if (!itemPurchasePriceMap.has(itemId)) {
          itemPurchasePriceMap.set(itemId, { totalCost: 0, totalQty: 0 });
        }
        
        const data = itemPurchasePriceMap.get(itemId);
        data.totalCost += purchaseItem.quantity * purchaseItem.price;
        data.totalQty += purchaseItem.quantity;
      }
    }

    // Get Store 1 data
    const store1Sales = await Sale.find(salesQuery).populate('items.item');
    let store1Revenue = 0;
    let store1Cost = 0;

    for (const sale of store1Sales) {
      for (const saleItem of sale.items) {
        if (!saleItem.item) continue;
        
        const itemRevenue = saleItem.quantity * saleItem.price;
        store1Revenue += itemRevenue;

        const itemId = saleItem.item._id.toString();
        const purchaseData = itemPurchasePriceMap.get(itemId);
        
        const avgPurchasePrice = purchaseData && purchaseData.totalQty > 0
          ? purchaseData.totalCost / purchaseData.totalQty
          : 0;

        store1Cost += saleItem.quantity * avgPurchasePrice;
      }
    }

    // Get Store 2 data
    const store2Sales = await SaleStore2.find(salesQuery).populate('items.item');
    let store2Revenue = 0;
    let store2Cost = 0;

    for (const sale of store2Sales) {
      for (const saleItem of sale.items) {
        if (!saleItem.item) continue;
        
        const itemRevenue = saleItem.quantity * saleItem.price;
        store2Revenue += itemRevenue;

        const itemId = saleItem.item._id.toString();
        const purchaseData = itemPurchasePriceMap.get(itemId);
        
        const avgPurchasePrice = purchaseData && purchaseData.totalQty > 0
          ? purchaseData.totalCost / purchaseData.totalQty
          : 0;

        store2Cost += saleItem.quantity * avgPurchasePrice;
      }
    }

    const store1Profit = store1Revenue - store1Cost;
    const store2Profit = store2Revenue - store2Cost;
    const totalRevenue = store1Revenue + store2Revenue;
    const totalCost = store1Cost + store2Cost;
    const totalProfit = store1Profit + store2Profit;

    // Fetch expenses for both stores
    const expensesQuery = Object.keys(dateFilter).length > 0 
      ? { date: dateFilter } 
      : {};
    
    const store1Expenses = await ExpenseStore.find(expensesQuery);
    let store1ExpensesTotal = 0;
    for (const expense of store1Expenses) {
      for (const item of expense.items) {
        store1ExpensesTotal += item.amount;
      }
    }
    
    const store2Expenses = await ExpenseStore2.find(expensesQuery);
    let store2ExpensesTotal = 0;
    for (const expense of store2Expenses) {
      for (const item of expense.items) {
        store2ExpensesTotal += item.amount;
      }
    }
    
    const store1NetProfit = store1Profit - store1ExpensesTotal;
    const store2NetProfit = store2Profit - store2ExpensesTotal;
    const totalExpenses = store1ExpensesTotal + store2ExpensesTotal;
    const totalNetProfit = totalProfit - totalExpenses;

    res.json({
      store1: {
        revenue: store1Revenue,
        cost: store1Cost,
        grossProfit: store1Profit,
        expenses: store1ExpensesTotal,
        netProfit: store1NetProfit,
        profitMargin: store1Revenue > 0 ? ((store1NetProfit / store1Revenue) * 100).toFixed(2) : 0,
        salesCount: store1Sales.length
      },
      store2: {
        revenue: store2Revenue,
        cost: store2Cost,
        grossProfit: store2Profit,
        expenses: store2ExpensesTotal,
        netProfit: store2NetProfit,
        profitMargin: store2Revenue > 0 ? ((store2NetProfit / store2Revenue) * 100).toFixed(2) : 0,
        salesCount: store2Sales.length
      },
      combined: {
        totalRevenue,
        totalCost,
        grossProfit: totalProfit,
        totalExpenses,
        netProfit: totalNetProfit,
        profitMargin: totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(2) : 0,
        totalSales: store1Sales.length + store2Sales.length
      }
    });
  } catch (error) {
    console.error('Error calculating combined profit/loss:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

import Customer from '../models/Customer.js';
import Sale from '../models/Sale.js';
import Settings from '../models/Settings.js';
import Joi from 'joi';

const customerSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().optional().allow(''),
  email: Joi.string().email().optional().allow(''),
});

export const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { error } = customerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { error } = customerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getInactiveCustomers = async (req, res) => {
  try {
    // Get settings
    const settings = await Settings.findOne();
    const inactiveDays = settings?.inactive_customer_days || 30;
    
    // Calculate date threshold
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - inactiveDays);
    
    // Get all customers
    const customers = await Customer.find();
    
    // Check each customer's last sale
    const inactiveCustomers = [];
    
    for (const customer of customers) {
      // Find the most recent sale for this customer
      const lastSale = await Sale.findOne({ customer: customer._id })
        .sort({ date: -1 })
        .limit(1);
      
      // If no sales or last sale is older than threshold
      if (!lastSale) {
        inactiveCustomers.push({
          ...customer.toObject(),
          lastPurchaseDate: null,
          daysSinceLastPurchase: null,
          message: 'No purchase history'
        });
      } else if (lastSale.date < thresholdDate) {
        const daysSince = Math.floor((new Date() - lastSale.date) / (1000 * 60 * 60 * 24));
        inactiveCustomers.push({
          ...customer.toObject(),
          lastPurchaseDate: lastSale.date,
          daysSinceLastPurchase: daysSince,
          message: `No purchase for ${daysSince} days`
        });
      }
    }
    
    res.json({
      inactiveDays,
      count: inactiveCustomers.length,
      customers: inactiveCustomers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

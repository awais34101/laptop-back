import Item from './Item.js';
import Customer from './Customer.js';
import Warehouse from './Warehouse.js';
import Store from './Store.js';

export const seedSampleData = async () => {
  // Items
  const items = [
    { name: 'Dell XPS 13', unit: 'pcs', category: 'Laptop', average_price: 4000 },
    { name: 'HP Spectre x360', unit: 'pcs', category: 'Laptop', average_price: 4200 },
    { name: 'Lenovo ThinkPad X1', unit: 'pcs', category: 'Laptop', average_price: 3900 },
  ];
  for (const i of items) {
    let item = await Item.findOne({ name: i.name });
    if (!item) item = await Item.create(i);
    await Warehouse.updateOne({ item: item._id }, { $set: { quantity: 10 } }, { upsert: true });
    await Store.updateOne({ item: item._id }, { $set: { remaining_quantity: 5 } }, { upsert: true });
  }
  // Customers
  const customers = [
    { name: 'Ali', phone: '0501234567', email: 'ali@email.com' },
    { name: 'Fatima', phone: '0507654321', email: 'fatima@email.com' },
  ];
  for (const c of customers) {
    await Customer.updateOne({ email: c.email }, { $set: c }, { upsert: true });
  }
};

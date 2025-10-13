import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm';

// Updated staff permissions with all missing sections
const STAFF_PERMISSIONS = {
  dashboard: { view: true },
  items: { view: true, add: true, edit: true },
  sales: { view: true, add: true, edit: true },
  salesStore2: { view: true, add: true, edit: true },
  customers: { view: true, add: true, edit: true },
  partsInventory: { view: true },
  parts: { view: true },
  documents: { view: true, add: true },
  expenses: { view: true, add: true },
  transfers: { view: true },
  store: { view: true, add: true, edit: true },
  store2: { view: true, add: true, edit: true },
  purchases: { view: true },
  purchaseSheets: { view: true },
  technicians: { view: true },
  warehouse: { view: true },
  time: { view: true, add: true, edit: true },
  returnsStore: { view: true, add: true, edit: true },
  returnsStore2: { view: true, add: true, edit: true },
  closingStore1: { view: true, add: true, edit: true },
  closingStore2: { view: true, add: true, edit: true },
  checklists: { view: true, add: true, edit: true, complete: true },
  settings: { view: true },
};

async function updateStaffPermissions() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all staff users
    const staffUsers = await User.find({ role: 'staff' });
    console.log(`\n📋 Found ${staffUsers.length} staff users`);

    if (staffUsers.length === 0) {
      console.log('⚠️  No staff users found to update');
      await mongoose.disconnect();
      return;
    }

    console.log('\n🔄 Updating staff user permissions...\n');

    for (const user of staffUsers) {
      console.log(`👤 Updating: ${user.name} (${user.email})`);
      console.log(`   Current role: ${user.role}`);
      
      // Update permissions
      user.permissions = STAFF_PERMISSIONS;
      await user.save();
      
      console.log(`   ✅ Updated permissions for ${user.name}`);
      console.log(`   📊 New permissions: ${Object.keys(user.permissions).length} sections`);
      console.log('');
    }

    console.log('✅ All staff users have been updated successfully!');
    console.log('\n📝 Summary of new staff permissions:');
    console.log('   - Dashboard: view');
    console.log('   - Items: view, add, edit');
    console.log('   - Sales (both stores): view, add, edit');
    console.log('   - Customers: view, add, edit');
    console.log('   - Parts Inventory: view');
    console.log('   - Parts: view');
    console.log('   - Documents: view, add');
    console.log('   - Expenses: view, add');
    console.log('   - Transfers: view');
    console.log('   - Store/Store2: view, add, edit');
    console.log('   - Purchases: view');
    console.log('   - Purchase Sheets: view');
    console.log('   - Technicians: view');
    console.log('   - Warehouse: view');
    console.log('   - Time: view, add, edit ⭐ NEW');
    console.log('   - Returns Store/Store2: view, add, edit ⭐ NEW');
    console.log('   - Closing Store1/Store2: view, add, edit ⭐ NEW');
    console.log('   - Checklists: view, add, edit, complete ⭐ NEW');
    console.log('   - Settings: view ⭐ NEW');
    console.log('\n🔐 Staff users need to log out and log back in to see all sidebar items!');

  } catch (error) {
    console.error('❌ Error updating staff permissions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

updateStaffPermissions();

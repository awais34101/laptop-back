import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || '';

async function checkStaffPermissions() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find the staff user
    const staffUser = await User.findOne({ role: 'staff' });
    if (!staffUser) {
      console.log('❌ No staff user found');
      return;
    }

    console.log(`\n📋 Staff user: ${staffUser.name} (${staffUser.email})`);
    console.log('Role:', staffUser.role);
    
    console.log('\n🔧 Custom permissions stored in database:');
    console.log(JSON.stringify(staffUser.permissions, null, 2));
    
    console.log('\n🎭 Role-based permissions (from ROLE_PERMISSIONS):');
    const ROLE_PERMISSIONS = {
      staff: {
        dashboard: { view: true },
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
      }
    };
    console.log(JSON.stringify(ROLE_PERMISSIONS.staff, null, 2));

    console.log('\n🔑 Effective permissions (what getEffectivePermissions returns):');
    const effectivePermissions = staffUser.getEffectivePermissions();
    console.log(JSON.stringify(effectivePermissions, null, 2));

    await mongoose.disconnect();
    console.log('\n✅ Check completed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStaffPermissions();
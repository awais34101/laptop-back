import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || '';

async function updateStaffPermissions() {
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

    console.log(`\n📋 Found staff user: ${staffUser.name} (${staffUser.email})`);
    
    // Get current custom permissions
    const currentPermissions = staffUser.permissions || {};
    console.log('\n🔧 Current custom permissions:');
    console.log(JSON.stringify(currentPermissions, null, 2));

    // Add the missing permissions
    const updatedPermissions = {
      ...currentPermissions,
      technicians: { view: true },
      purchases: { view: true }
    };

    console.log('\n✨ Updated permissions will be:');
    console.log(JSON.stringify(updatedPermissions, null, 2));

    // Update the user
    await User.findByIdAndUpdate(staffUser._id, {
      permissions: updatedPermissions
    });

    console.log('\n✅ Staff user permissions updated successfully!');

    // Verify the update
    const updatedUser = await User.findById(staffUser._id);
    const effectivePermissions = updatedUser.getEffectivePermissions();
    
    console.log('\n🔑 New effective permissions:');
    console.log('- technicians.view:', effectivePermissions.technicians?.view || false);
    console.log('- purchases.view:', effectivePermissions.purchases?.view || false);
    console.log('- purchaseSheets.view:', effectivePermissions.purchaseSheets?.view || false);

    await mongoose.disconnect();
    console.log('\n✅ Update completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateStaffPermissions();
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || '';

async function createTrulyLimitedStaff() {
  try {
    console.log('🔍 Creating Truly Limited Staff User...\n');

    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Step 1: Delete existing limited staff user if exists
    await User.deleteOne({ email: 'limitedstaff@example.com' });
    console.log('🗑️ Cleaned up existing limited staff user');

    // Step 2: Create user with minimal permissions directly in database
    const limitedStaffUser = new User({
      name: 'Limited Staff',
      email: 'limitedstaff@example.com',
      password: 'LimitedPass123',
      role: 'staff',
      canViewFinancials: false,
      // Override with truly limited permissions
      permissions: {
        dashboard: { view: true },
        items: { view: true, add: true, edit: true, delete: true }
        // Only these two sections, nothing else
      },
      isActive: true,
      passwordVersion: 1
    });

    await limitedStaffUser.save();
    console.log('✅ Limited Staff user created with custom permissions');

    // Step 3: Verify the permissions were saved correctly
    const savedUser = await User.findOne({ email: 'limitedstaff@example.com' });
    console.log('\n📋 Saved User Permissions:');
    console.log(JSON.stringify(savedUser.permissions, null, 2));

    // Step 4: Test login
    const isPasswordValid = await savedUser.comparePassword('LimitedPass123');
    console.log('\n🔐 Password Test:', isPasswordValid ? '✅ Valid' : '❌ Invalid');

    console.log('\n🎯 Expected Sidebar Behavior:');
    console.log('   ✅ Should see: Dashboard, Items');
    console.log('   ❌ Should NOT see: Sales, Customers, Store, etc.');
    console.log('\n📋 Test Instructions:');
    console.log('   1. Open browser and go to http://localhost:3000/login');
    console.log('   2. Login with: limitedstaff@example.com / LimitedPass123');
    console.log('   3. Check sidebar - should only show Dashboard and Items sections');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTrulyLimitedStaff();
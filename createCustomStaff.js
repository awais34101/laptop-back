import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || '';

async function createCustomStaff() {
  try {
    console.log('🔍 Creating Custom Staff User with ONLY Technician + Purchase Sheets Access...\n');

    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Step 1: Delete existing user if exists (optional - change email if you want to keep existing)
    const existingUser = await User.findOne({ email: 'customstaff@example.com' });
    if (existingUser) {
      await User.deleteOne({ email: 'customstaff@example.com' });
      console.log('🗑️ Cleaned up existing custom staff user');
    }

    // Step 2: Create user with ONLY the permissions you specified
    const customStaffUser = new User({
      name: 'Custom Staff',
      email: 'customstaff@example.com',
      password: 'CustomPass123',
      role: 'staff',
      canViewFinancials: false,
      // ONLY Technician section and Purchase Sheets access
      permissions: {
        dashboard: { view: true }, // Keep dashboard for navigation
        technicians: { view: true, add: true, edit: true }, // Technician section
        purchaseSheets: { view: true, add: true, edit: true, delete: true } // Purchase Sheets
        // NO access to: sales, store, customers, warehouse, parts, etc.
      },
      isActive: true,
      passwordVersion: 1
    });

    await customStaffUser.save();
    console.log('✅ Custom Staff user created successfully');

    // Step 3: Verify the permissions were saved correctly
    const savedUser = await User.findOne({ email: 'customstaff@example.com' });
    console.log('\n📋 Saved User Details:');
    console.log('   Name:', savedUser.name);
    console.log('   Email:', savedUser.email);
    console.log('   Role:', savedUser.role);
    console.log('   Can View Financials:', savedUser.canViewFinancials);
    console.log('   Permissions:', JSON.stringify(savedUser.permissions, null, 2));

    // Step 4: Test effective permissions
    const effectivePermissions = savedUser.getEffectivePermissions();
    console.log('\n📋 Effective Permissions (what user actually gets):');
    console.log(JSON.stringify(effectivePermissions, null, 2));

    console.log('\n🎯 Expected Sidebar Behavior:');
    console.log('   ✅ Should see: Dashboard, Technicians (in Other section), Purchase Sheets (in Sheets section)');
    console.log('   ❌ Should NOT see: Store sections, Sales, Purchases, Parts, Customers, etc.');
    
    console.log('\n📋 Login Credentials:');
    console.log('   Email: customstaff@example.com');
    console.log('   Password: CustomPass123');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Open http://localhost:3000/login');
    console.log('   2. Login with the credentials above');
    console.log('   3. Check if sidebar only shows the allowed sections');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error creating custom staff user:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

createCustomStaff();
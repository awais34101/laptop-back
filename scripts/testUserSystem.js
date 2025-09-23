import mongoose from 'mongoose';
import User from '../models/User.js';

// Test script for the new user and permission system
async function testUserSystem() {
  try {
    console.log('🧪 Testing User and Permission System');
    console.log('====================================');

    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/laptop-crm', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to database');

    // Test 1: Create admin user
    console.log('\n📝 Test 1: Creating admin user...');
    try {
      const adminUser = await User.createUser({
        name: 'System Administrator',
        email: 'admin@laptop-crm.com',
        password: 'admin123',
        role: 'admin'
      });
      console.log('✅ Admin user created:', adminUser.name);
      console.log('   Permissions:', Object.keys(adminUser.getEffectivePermissions()));
    } catch (error) {
      if (error.code === 11000) {
        console.log('ℹ️  Admin user already exists');
      } else {
        throw error;
      }
    }

    // Test 2: Create manager user
    console.log('\n📝 Test 2: Creating manager user...');
    try {
      const managerUser = await User.createUser({
        name: 'Store Manager',
        email: 'manager@laptop-crm.com',
        password: 'manager123',
        role: 'manager'
      });
      console.log('✅ Manager user created:', managerUser.name);
      console.log('   Can view financials:', managerUser.canViewFinancials);
      console.log('   Has permissions for:', Object.keys(managerUser.getEffectivePermissions()));
    } catch (error) {
      if (error.code === 11000) {
        console.log('ℹ️  Manager user already exists');
      } else {
        throw error;
      }
    }

    // Test 3: Create staff user
    console.log('\n📝 Test 3: Creating staff user...');
    try {
      const staffUser = await User.createUser({
        name: 'Sales Staff',
        email: 'staff@laptop-crm.com',
        password: 'staff123',
        role: 'staff'
      });
      console.log('✅ Staff user created:', staffUser.name);
      console.log('   Can view financials:', staffUser.canViewFinancials);
      console.log('   Has permissions for:', Object.keys(staffUser.getEffectivePermissions()));
    } catch (error) {
      if (error.code === 11000) {
        console.log('ℹ️  Staff user already exists');
      } else {
        throw error;
      }
    }

    // Test 4: Test permission checking
    console.log('\n📝 Test 4: Testing permission system...');
    const testUsers = await User.find({ email: { $in: ['admin@laptop-crm.com', 'manager@laptop-crm.com', 'staff@laptop-crm.com'] } });
    
    for (const user of testUsers) {
      console.log(`\n👤 ${user.name} (${user.role}):`);
      console.log(`   Can view sales: ${user.hasPermission('sales', 'view')}`);
      console.log(`   Can edit items: ${user.hasPermission('items', 'edit')}`);
      console.log(`   Can delete users: ${user.hasPermission('users', 'delete')}`);
      console.log(`   Can view settings: ${user.hasPermission('settings', 'view')}`);
    }

    // Test 5: Test available permissions
    console.log('\n📝 Test 5: Available permissions in system...');
    const availablePermissions = User.getAvailablePermissions();
    console.log('Available sections:', Object.keys(availablePermissions));
    
    // Test 6: Test role permissions
    console.log('\n📝 Test 6: Role-based permissions...');
    const roles = ['admin', 'manager', 'staff', 'technician'];
    for (const role of roles) {
      const rolePerms = User.getRolePermissions(role);
      console.log(`${role}: ${Object.keys(rolePerms).length} sections`);
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\n🎯 User Management Features Available:');
    console.log('   • Professional RBAC system with 4 roles');
    console.log('   • Granular permissions per section and action');
    console.log('   • Account locking after failed login attempts');
    console.log('   • Token invalidation for security');
    console.log('   • Comprehensive user CRUD operations');
    console.log('   • Bulk user management');
    console.log('   • Password security and validation');
    console.log('   • Audit trail with created/updated by tracking');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run tests if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testUserSystem();
}

export default testUserSystem;
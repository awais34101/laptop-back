import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function createLimitedStaffUser() {
  try {
    console.log('🔍 Creating Limited Staff User for Sidebar Testing...\n');

    // Step 1: Login as admin
    console.log('📝 Step 1: Admin Login');
    const loginResponse = await fetch(`${BASE_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'awaiszafar704@gmail.com',
        password: 'Awais123'
      })
    });

    const loginData = await loginResponse.json();
    console.log('✅ Admin login successful');
    const token = loginData.token;

    // Step 2: Create a staff user with ONLY Dashboard and Items access
    console.log('\n📝 Step 2: Creating Limited Staff User');
    const limitedStaffData = {
      name: 'Limited Staff',
      email: 'limitedstaff@example.com',
      password: 'LimitedPass123',
      role: 'staff',
      canViewFinancials: false,
      permissions: {
        // Only Dashboard and Items access
        dashboard: { view: true },
        items: { view: true, add: true, edit: true, delete: true }
        // NO access to: purchases, sales, customers, warehouse, etc.
      }
    };

    console.log('Creating limited staff user...');
    const createResponse = await fetch(`${BASE_URL}/users/add-staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(limitedStaffData)
    });

    if (createResponse.ok) {
      const createdUser = await createResponse.json();
      console.log('✅ Limited Staff user created successfully');
      console.log('   User Name:', createdUser.user?.name);
      console.log('   User Email:', createdUser.user?.email);
      console.log('   Permissions:', JSON.stringify(createdUser.user?.permissions, null, 2));
    } else {
      const errorText = await createResponse.text();
      console.error('❌ Failed to create limited staff user');
      console.error('   Error:', errorText);
      return;
    }

    // Step 3: Test limited staff user login
    console.log('\n📝 Step 3: Testing Limited Staff User Login');
    const staffLoginResponse = await fetch(`${BASE_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'limitedstaff@example.com',
        password: 'LimitedPass123'
      })
    });

    if (staffLoginResponse.ok) {
      const staffLoginData = await staffLoginResponse.json();
      console.log('✅ Limited Staff user login successful');
      console.log('   Staff Name:', staffLoginData.user?.name);
      console.log('   Staff Role:', staffLoginData.user?.role);
      console.log('   Available Permissions:');
      const permissions = staffLoginData.user?.permissions || {};
      Object.keys(permissions).forEach(section => {
        console.log(`     ${section}:`, permissions[section]);
      });
      
      console.log('\n🎯 Expected Sidebar Behavior:');
      console.log('   ✅ Should see: Dashboard, Items');
      console.log('   ❌ Should NOT see: Purchases, Sales, Customers, Warehouse, Store, etc.');
      console.log('\n📋 Test Instructions:');
      console.log('   1. Open browser and go to http://localhost:3000/login');
      console.log('   2. Login with: limitedstaff@example.com / LimitedPass123');
      console.log('   3. Check sidebar - should only show Dashboard and Items sections');
      console.log('   4. All other sections should be hidden');
      
    } else {
      const staffError = await staffLoginResponse.text();
      console.error('❌ Limited staff user login failed');
      console.error('   Error:', staffError);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

createLimitedStaffUser();
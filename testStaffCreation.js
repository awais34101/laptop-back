import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function testStaffCreation() {
  try {
    console.log('🔍 Testing Staff User Creation API...\n');

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

    if (!loginResponse.ok) {
      console.error('❌ Admin login failed');
      const error = await loginResponse.text();
      console.error('Error:', error);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Admin login successful');
    console.log('   Token received:', loginData.token ? 'Yes' : 'No');
    
    const token = loginData.token;

    // Step 2: Create a staff user
    console.log('\n📝 Step 2: Creating Staff User');
    const staffData = {
      name: 'Test Staff',
      email: 'teststaff@example.com',
      password: 'StaffPass123',
      role: 'staff',
      canViewFinancials: false,
      permissions: {
        dashboard: { view: true },
        sales: { view: true, add: true, edit: true },
        customers: { view: true, add: true, edit: true },
        store: { view: true, add: true, edit: true },
        store2: { view: true, add: true, edit: true }
      }
    };

    console.log('Sending staff creation request...');
    const createResponse = await fetch(`${BASE_URL}/users/add-staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(staffData)
    });

    console.log('Response status:', createResponse.status);
    const responseText = await createResponse.text();
    console.log('Response body:', responseText);

    if (createResponse.ok) {
      console.log('✅ Staff user created successfully');
      const createdUser = JSON.parse(responseText);
      console.log('   User ID:', createdUser.user?.id);
      console.log('   User Name:', createdUser.user?.name);
      console.log('   User Email:', createdUser.user?.email);
      console.log('   User Role:', createdUser.user?.role);
    } else {
      console.error('❌ Staff user creation failed');
      console.error('   Status:', createResponse.status);
      console.error('   Error:', responseText);
    }

    // Step 3: Test staff user login
    console.log('\n📝 Step 3: Testing Staff User Login');
    const staffLoginResponse = await fetch(`${BASE_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'teststaff@example.com',
        password: 'StaffPass123'
      })
    });

    if (staffLoginResponse.ok) {
      console.log('✅ Staff user login successful');
      const staffLoginData = await staffLoginResponse.json();
      console.log('   Staff Name:', staffLoginData.user?.name);
      console.log('   Staff Role:', staffLoginData.user?.role);
    } else {
      console.error('❌ Staff user login failed');
      const staffError = await staffLoginResponse.text();
      console.error('   Error:', staffError);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testStaffCreation();
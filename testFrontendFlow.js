import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function testFrontendFlow() {
  try {
    console.log('🔍 Testing Frontend-like Staff Creation Flow...\n');

    // Step 1: Login as admin (like frontend does)
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
    console.log('   Admin permissions for users:', loginData.user.permissions?.users);
    
    const token = loginData.token;

    // Step 2: Check users list (like frontend does)
    console.log('\n📝 Step 2: Getting Users List');
    const listResponse = await fetch(`${BASE_URL}/users/list`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (listResponse.ok) {
      const listData = await listResponse.json();
      console.log('✅ Users list retrieved');
      console.log('   Total users:', Array.isArray(listData) ? listData.length : listData.users?.length || 'Unknown format');
    } else {
      console.error('❌ Failed to get users list:', listResponse.status);
    }

    // Step 3: Create staff user (frontend style with form spread)
    console.log('\n📝 Step 3: Creating Staff User (Frontend Style)');
    
    // Simulate frontend form data
    const form = {
      name: 'Frontend Test Staff',
      email: 'frontendtest@example.com',
      password: 'FrontendPass123',
      role: 'staff',
      canViewFinancials: false,
      permissions: {
        dashboard: { view: true },
        sales: { view: true, add: true, edit: true },
        customers: { view: true, add: true, edit: true }
      },
      technicianId: ''
    };

    // Simulate frontend userPayload creation
    const userPayload = {
      role: form.role,
      canViewFinancials: form.canViewFinancials,
      isActive: true,
      permissions: form.permissions,
      technicianId: form.role === 'technician' ? form.technicianId : null
    };

    // Simulate frontend request (exactly like line 159 in UsersList.jsx)
    const requestBody = { ...form, ...userPayload };
    console.log('   Request body keys:', Object.keys(requestBody));
    console.log('   Has name:', !!requestBody.name);
    console.log('   Has email:', !!requestBody.email);
    console.log('   Has password:', !!requestBody.password);

    const createResponse = await fetch(`${BASE_URL}/users/add-staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('   Response status:', createResponse.status);
    const responseText = await createResponse.text();

    if (createResponse.ok) {
      console.log('✅ Frontend-style staff creation successful');
      const createdUser = JSON.parse(responseText);
      console.log('   User Name:', createdUser.user?.name);
      console.log('   User Email:', createdUser.user?.email);
    } else {
      console.error('❌ Frontend-style staff creation failed');
      console.error('   Error:', responseText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendFlow();
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function testLimitedStaffAPI() {
  try {
    console.log('🔍 Testing Limited Staff API Access...\n');

    // Step 1: Login with limited staff user
    console.log('🔐 Logging in as limited staff...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'limitedstaff@example.com',
        password: 'LimitedPass123'
      })
    });

    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      throw new Error(loginData.error || 'Login failed');
    }

    const token = loginData.token;
    console.log('✅ Login successful');
    console.log('User:', loginData.user.name);
    console.log('Role:', loginData.user.role);
    console.log('Permissions:', JSON.stringify(loginData.user.permissions, null, 2));

    const headers = { Authorization: `Bearer ${token}` };

    console.log('\n📋 Testing Dashboard API Calls...');

    // Test all the API calls that Dashboard makes
    const apiTests = [
      { name: 'Items', url: '/items', shouldWork: true },
      { name: 'Warehouse', url: '/warehouse', shouldWork: false },
      { name: 'Warehouse Available', url: '/warehouse/available', shouldWork: false },
      { name: 'Store', url: '/store', shouldWork: false },
      { name: 'Store2', url: '/store2', shouldWork: false },
      { name: 'Slow Moving Alerts', url: '/alerts/slow-moving', shouldWork: false },
      { name: 'Low Stock Alerts', url: '/alerts/low-stock', shouldWork: false },
      { name: 'Sales Total', url: '/sales/total', shouldWork: false },
      { name: 'Store2 Sales Total', url: '/sales-store2/total', shouldWork: false },
    ];

    for (const test of apiTests) {
      try {
        const response = await fetch(`${API_BASE}${test.url}`, { headers });
        const data = await response.json();
        
        if (response.ok && test.shouldWork) {
          console.log(`✅ ${test.name}: SUCCESS (${Array.isArray(data) ? data.length : 'data'} items)`);
        } else if (response.ok && !test.shouldWork) {
          console.log(`⚠️  ${test.name}: Unexpected success (should have been 403)`);
        } else if (response.status === 403 && !test.shouldWork) {
          console.log(`✅ ${test.name}: 403 Forbidden (expected)`);
        } else if (response.status === 403 && test.shouldWork) {
          console.log(`❌ ${test.name}: 403 Forbidden (should have worked)`);
        } else {
          console.log(`❌ ${test.name}: ${response.status} ${data.error || response.statusText}`);
        }
      } catch (error) {
        console.log(`❌ ${test.name}: Network error - ${error.message}`);
      }
    }

    console.log('\n🎯 Summary:');
    console.log('   - Limited staff should only be able to access Items');
    console.log('   - All other endpoints should return 403 Forbidden');
    console.log('   - Dashboard should handle 403 errors gracefully');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

testLimitedStaffAPI();
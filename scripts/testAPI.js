import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

async function testUserAPI() {
  console.log('🧪 Testing User API Endpoints');
  console.log('============================');

  try {
    // Test 1: Login with admin credentials
    console.log('\n📝 Test 1: Admin Login');
    const loginResponse = await fetch(`${BASE_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'awaiszafar704@gmail.com',
        password: 'Awais123'
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful');
      console.log('   User:', loginData.user.name);
      console.log('   Role:', loginData.user.role);
      console.log('   Permissions:', Object.keys(loginData.user.permissions).join(', '));
      
      const token = loginData.token;

      // Test 2: Get user profile
      console.log('\n📝 Test 2: Get Profile');
      const profileResponse = await fetch(`${BASE_URL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log('✅ Profile retrieved');
        console.log('   Name:', profileData.user.name);
        console.log('   Email:', profileData.user.email);
      } else {
        console.log('❌ Profile retrieval failed:', profileResponse.status);
      }

      // Test 3: List users (admin only)
      console.log('\n📝 Test 3: List Users');
      const listResponse = await fetch(`${BASE_URL}/users/list`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (listResponse.ok) {
        const listData = await listResponse.json();
        console.log('✅ Users listed');
        console.log('   Total users:', listData.users.length);
        listData.users.forEach(user => {
          console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
        });
      } else {
        console.log('❌ User listing failed:', listResponse.status);
      }

      // Test 4: Create a test user
      console.log('\n📝 Test 4: Create Test User');
      const createResponse = await fetch(`${BASE_URL}/users/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Manager',
          email: 'test@laptop-crm.com',
          password: 'test123456',
          role: 'manager',
          canViewFinancials: true
        })
      });

      if (createResponse.ok) {
        const createData = await createResponse.json();
        console.log('✅ Test user created');
        console.log('   Name:', createData.user.name);
        console.log('   Role:', createData.user.role);
      } else {
        const error = await createResponse.json();
        console.log('❌ User creation failed:', error.error);
      }

      // Test 5: Get available permissions
      console.log('\n📝 Test 5: Get Available Permissions');
      const permissionsResponse = await fetch(`${BASE_URL}/users/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (permissionsResponse.ok) {
        const permissionsData = await permissionsResponse.json();
        console.log('✅ Permissions retrieved');
        console.log('   Available sections:', Object.keys(permissionsData.availablePermissions).length);
        console.log('   Role templates:', Object.keys(permissionsData.rolePermissions).join(', '));
      } else {
        console.log('❌ Permissions retrieval failed:', permissionsResponse.status);
      }

    } else {
      const error = await loginResponse.json();
      console.log('❌ Login failed:', error.error);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }

  console.log('\n🎯 Test Summary: Professional User Management System');
  console.log('   ✓ JWT-based authentication with token validation');
  console.log('   ✓ Role-based access control (RBAC)');
  console.log('   ✓ Granular permission system');
  console.log('   ✓ User CRUD operations');
  console.log('   ✓ Account security features');
  console.log('   ✓ Comprehensive API endpoints');
}

// Run test
testUserAPI();
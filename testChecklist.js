/**
 * CHECKLIST SYSTEM TEST SCRIPT
 * Tests all endpoints and functionality
 */

import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
let token = '';
let categoryId = '';
let templateId = '';
let completionId = '';

// Test authentication
async function login() {
  try {
    console.log('🔐 Testing Login...');
    const response = await axios.post(`${API_URL}/users/login`, {
      username: 'admin',
      password: 'admin123'
    });
    token = response.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

// Test Categories
async function testCategories() {
  console.log('\n📁 Testing Categories...');
  
  try {
    // Create category
    console.log('Creating category...');
    const createRes = await axios.post(`${API_URL}/checklists/categories`, {
      name: 'Daily Operations',
      description: 'Daily operational checklists for stores'
    }, {
      headers: { 'x-auth-token': token }
    });
    categoryId = createRes.data._id;
    console.log('✅ Category created:', createRes.data.name);

    // Get all categories
    const getRes = await axios.get(`${API_URL}/checklists/categories`, {
      headers: { 'x-auth-token': token }
    });
    console.log(`✅ Found ${getRes.data.length} categories`);

    // Update category
    await axios.put(`${API_URL}/checklists/categories/${categoryId}`, {
      name: 'Daily Operations Updated',
      description: 'Updated description'
    }, {
      headers: { 'x-auth-token': token }
    });
    console.log('✅ Category updated');

    return true;
  } catch (error) {
    console.error('❌ Category test failed:', error.response?.data || error.message);
    return false;
  }
}

// Test Templates
async function testTemplates() {
  console.log('\n📋 Testing Templates...');
  
  try {
    // Create template
    console.log('Creating template...');
    const createRes = await axios.post(`${API_URL}/checklists/templates`, {
      name: 'Store Opening Checklist',
      description: 'Daily opening procedures for store',
      category: categoryId,
      frequency: 'daily',
      stores: ['store1'],
      items: [
        { text: 'Unlock doors and turn on lights', required: true },
        { text: 'Check inventory levels', required: true },
        { text: 'Boot up POS system', required: true },
        { text: 'Count cash in register', required: true },
        { text: 'Check display laptops', required: false }
      ]
    }, {
      headers: { 'x-auth-token': token }
    });
    templateId = createRes.data._id;
    console.log('✅ Template created:', createRes.data.name);
    console.log(`   - ${createRes.data.items.length} items`);

    // Get all templates
    const getRes = await axios.get(`${API_URL}/checklists/templates`, {
      headers: { 'x-auth-token': token }
    });
    console.log(`✅ Found ${getRes.data.length} templates`);

    // Get template by ID
    const getOneRes = await axios.get(`${API_URL}/checklists/templates/${templateId}`, {
      headers: { 'x-auth-token': token }
    });
    console.log('✅ Template retrieved by ID');

    // Update template
    await axios.put(`${API_URL}/checklists/templates/${templateId}`, {
      name: 'Store Opening Checklist - Updated',
      description: 'Updated daily opening procedures',
      category: categoryId,
      frequency: 'daily',
      stores: ['store1', 'store2'],
      items: [
        { text: 'Unlock doors and turn on lights', required: true },
        { text: 'Check inventory levels', required: true },
        { text: 'Boot up POS system', required: true },
        { text: 'Count cash in register', required: true },
        { text: 'Check display laptops', required: false },
        { text: 'Review daily sales targets', required: false }
      ]
    }, {
      headers: { 'x-auth-token': token }
    });
    console.log('✅ Template updated (added 1 item)');

    return true;
  } catch (error) {
    console.error('❌ Template test failed:', error.response?.data || error.message);
    return false;
  }
}

// Test Completions
async function testCompletions() {
  console.log('\n✅ Testing Completions...');
  
  try {
    // Get pending checklists
    const pendingRes = await axios.get(`${API_URL}/checklists/pending`, {
      headers: { 'x-auth-token': token }
    });
    console.log(`✅ Found ${pendingRes.data.length} pending checklists`);

    // Start completion
    console.log('Starting checklist completion...');
    const startRes = await axios.post(`${API_URL}/checklists/completions`, {
      templateId: templateId,
      store: 'store1',
      notes: 'Testing checklist completion'
    }, {
      headers: { 'x-auth-token': token }
    });
    completionId = startRes.data._id;
    console.log('✅ Checklist started');
    console.log(`   - Status: ${startRes.data.status}`);
    console.log(`   - Items: ${startRes.data.items.length}`);

    // Update completion (complete some items)
    const itemsToUpdate = startRes.data.items.map((item, index) => ({
      ...item,
      completed: index < 3, // Complete first 3 items
      notes: index === 0 ? 'All lights working' : ''
    }));

    await axios.put(`${API_URL}/checklists/completions/${completionId}`, {
      items: itemsToUpdate,
      notes: 'Partial completion - 3 out of 6 items done'
    }, {
      headers: { 'x-auth-token': token }
    });
    console.log('✅ Checklist updated (3/6 items completed)');

    // Complete all items
    const allCompleted = startRes.data.items.map(item => ({
      ...item,
      completed: true,
      notes: 'Completed successfully'
    }));

    await axios.put(`${API_URL}/checklists/completions/${completionId}`, {
      items: allCompleted,
      notes: 'All tasks completed successfully',
      status: 'completed'
    }, {
      headers: { 'x-auth-token': token }
    });
    console.log('✅ Checklist fully completed (6/6 items)');

    // Get completion history
    const historyRes = await axios.get(`${API_URL}/checklists/history?days=7`, {
      headers: { 'x-auth-token': token }
    });
    console.log(`✅ Found ${historyRes.data.length} completed checklists in last 7 days`);

    // Get statistics
    const statsRes = await axios.get(`${API_URL}/checklists/stats?days=30`, {
      headers: { 'x-auth-token': token }
    });
    console.log('✅ Statistics retrieved:');
    console.log(`   - Total: ${statsRes.data.overall.total}`);
    console.log(`   - Completed: ${statsRes.data.overall.completed}`);
    console.log(`   - Avg completion rate: ${Math.round(statsRes.data.overall.avgCompletionRate)}%`);

    return true;
  } catch (error) {
    console.error('❌ Completion test failed:', error.response?.data || error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Checklist System Tests...\n');
  
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Tests aborted - login failed');
    return;
  }

  const categorySuccess = await testCategories();
  const templateSuccess = await testTemplates();
  const completionSuccess = await testCompletions();

  console.log('\n📊 Test Summary:');
  console.log(`Categories: ${categorySuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Templates: ${templateSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Completions: ${completionSuccess ? '✅ PASSED' : '❌ FAILED'}`);

  if (categorySuccess && templateSuccess && completionSuccess) {
    console.log('\n🎉 ALL TESTS PASSED! Checklist system is working perfectly!\n');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the errors above.\n');
  }
}

// Run tests
runTests();

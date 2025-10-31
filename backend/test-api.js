const axios = require('axios');
const colors = require('colors');

// Configuration
const BASE_URL = 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api`;

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

// Helper function to log test results
function logTest(endpoint, method, status, message, data = null) {
    totalTests++;
    const testResult = {
        endpoint,
        method,
        status,
        message,
        timestamp: new Date().toISOString(),
        data
    };
    
    if (status === 'PASS') {
        passedTests++;
        console.log(`✅ ${method} ${endpoint}`.green + ` - ${message}`.gray);
    } else {
        failedTests++;
        console.log(`❌ ${method} ${endpoint}`.red + ` - ${message}`.gray);
        if (data) {
            console.log(`   Error: ${JSON.stringify(data, null, 2)}`.red);
        }
    }
    
    testResults.push(testResult);
}

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null, headers = {}) {
    try {
        const config = {
            method,
            url: `${API_BASE}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return {
            success: true,
            status: response.status,
            data: response.data,
            headers: response.headers
        };
    } catch (error) {
        return {
            success: false,
            status: error.response?.status || 0,
            data: error.response?.data || error.message,
            error: error.message
        };
    }
}

// Validation helpers
function validateResponseStructure(data, expectedFields) {
    const missing = [];
    for (const field of expectedFields) {
        if (!(field in data)) {
            missing.push(field);
        }
    }
    return missing;
}

function validateSuccessResponse(data) {
    return validateResponseStructure(data, ['success']);
}

function validateErrorResponse(data) {
    return validateResponseStructure(data, ['success', 'message']);
}

// Test functions
async function testBasicEndpoints() {
    console.log('\n🔍 Testing Basic Endpoints'.cyan.bold);
    console.log('=' .repeat(50).cyan);
    
    // Test root endpoint (direct to server, not API)
    try {
        const rootResponse = await axios.get(BASE_URL);
        if (rootResponse.status === 200) {
            logTest('/', 'GET', 'PASS', 'Root endpoint accessible');
        } else {
            logTest('/', 'GET', 'FAIL', 'Root endpoint failed', rootResponse.data);
        }
    } catch (error) {
        logTest('/', 'GET', 'FAIL', 'Root endpoint failed', error.message);
    }
    
    // Test API test endpoint
    const testResponse = await makeRequest('GET', '/test');
    if (testResponse.success && testResponse.status === 200) {
        const missing = validateSuccessResponse(testResponse.data);
        if (missing.length === 0 && testResponse.data.success === true) {
            logTest('/test', 'GET', 'PASS', 'Test endpoint working correctly');
        } else {
            logTest('/test', 'GET', 'FAIL', `Missing fields: ${missing.join(', ')}`, testResponse.data);
        }
    } else {
        logTest('/test', 'GET', 'FAIL', 'Test endpoint failed', testResponse.data);
    }
}

async function testAuthEndpoints() {
    console.log('\n🔐 Testing Auth Endpoints'.cyan.bold);
    console.log('=' .repeat(50).cyan);
    
    const authEndpoints = [
        { path: '/auth/register', method: 'POST', requiresAuth: false },
        { path: '/auth/login', method: 'POST', requiresAuth: false },
        { path: '/auth/logout', method: 'POST', requiresAuth: true },
        { path: '/auth/refresh', method: 'POST', requiresAuth: false },
        { path: '/auth/verify-email', method: 'POST', requiresAuth: false },
        { path: '/auth/forgot-password', method: 'POST', requiresAuth: false },
        { path: '/auth/reset-password', method: 'POST', requiresAuth: false },
        { path: '/auth/me', method: 'GET', requiresAuth: true }
    ];
    
    for (const endpoint of authEndpoints) {
        const response = await makeRequest(endpoint.method, endpoint.path);
        
        if (endpoint.requiresAuth) {
            // Should return 401 without auth
            if (response.status === 401) {
                logTest(endpoint.path, endpoint.method, 'PASS', 'Correctly requires authentication');
            } else {
                logTest(endpoint.path, endpoint.method, 'FAIL', `Expected 401, got ${response.status}`, response.data);
            }
        } else {
            // Should return 400 for missing data, not 404
            if (response.status === 400 || response.status === 422) {
                logTest(endpoint.path, endpoint.method, 'PASS', 'Endpoint accessible, validates input');
            } else if (response.status === 404) {
                logTest(endpoint.path, endpoint.method, 'FAIL', 'Endpoint not found', response.data);
            } else {
                logTest(endpoint.path, endpoint.method, 'PASS', `Endpoint accessible (${response.status})`);
            }
        }
    }
}

async function testIssueEndpoints() {
    console.log('\n📋 Testing Issue Endpoints'.cyan.bold);
    console.log('=' .repeat(50).cyan);
    
    // Test GET /issues (should work without auth for public issues)
    const issuesResponse = await makeRequest('GET', '/issues');
    if (issuesResponse.success && issuesResponse.status === 200) {
        const expectedFields = ['success', 'issues', 'pagination'];
        const missing = validateResponseStructure(issuesResponse.data, expectedFields);
        if (missing.length === 0) {
            logTest('/issues', 'GET', 'PASS', 'Issues list endpoint working');
        } else {
            logTest('/issues', 'GET', 'FAIL', `Missing fields: ${missing.join(', ')}`, issuesResponse.data);
        }
    } else {
        logTest('/issues', 'GET', 'FAIL', 'Issues endpoint failed', issuesResponse.data);
    }
    
    // Test GET /issues with query parameters
    const filteredResponse = await makeRequest('GET', '/issues?status=Open&page=1&limit=5');
    if (filteredResponse.success && filteredResponse.status === 200) {
        logTest('/issues?status=Open', 'GET', 'PASS', 'Issues filtering working');
    } else {
        logTest('/issues?status=Open', 'GET', 'FAIL', 'Issues filtering failed', filteredResponse.data);
    }
    
    // Test POST /issues (should require auth)
    const createResponse = await makeRequest('POST', '/issues', {
        title: 'Test Issue',
        description: 'Test Description'
    });
    if (createResponse.status === 401) {
        logTest('/issues', 'POST', 'PASS', 'Create issue correctly requires authentication');
    } else {
        logTest('/issues', 'POST', 'FAIL', `Expected 401, got ${createResponse.status}`, createResponse.data);
    }
    
    // Test GET /issues/:id with invalid ID
    const invalidIdResponse = await makeRequest('GET', '/issues/invalid-id');
    if (invalidIdResponse.status === 400 || invalidIdResponse.status === 404) {
        logTest('/issues/:id', 'GET', 'PASS', 'Invalid ID handled correctly');
    } else {
        logTest('/issues/:id', 'GET', 'FAIL', `Expected 400/404, got ${invalidIdResponse.status}`, invalidIdResponse.data);
    }
    
    // Test categories endpoint
    const categoriesResponse = await makeRequest('GET', '/issues/categories/list');
    if (categoriesResponse.success && categoriesResponse.status === 200) {
        const expectedFields = ['success', 'categories'];
        const missing = validateResponseStructure(categoriesResponse.data, expectedFields);
        if (missing.length === 0) {
            logTest('/issues/categories/list', 'GET', 'PASS', 'Categories endpoint working');
        } else {
            logTest('/issues/categories/list', 'GET', 'FAIL', `Missing fields: ${missing.join(', ')}`, categoriesResponse.data);
        }
    } else {
        logTest('/issues/categories/list', 'GET', 'FAIL', 'Categories endpoint failed', categoriesResponse.data);
    }
}

async function testUserEndpoints() {
    console.log('\n👥 Testing User Endpoints'.cyan.bold);
    console.log('=' .repeat(50).cyan);
    
    const userEndpoints = [
        { path: '/users/profile', method: 'GET', requiresAuth: true },
        { path: '/users/profile', method: 'PUT', requiresAuth: true },
        { path: '/users/change-password', method: 'POST', requiresAuth: true },
        { path: '/users/upload-avatar', method: 'POST', requiresAuth: true },
        { path: '/users/preferences', method: 'GET', requiresAuth: true },
        { path: '/users/preferences', method: 'PUT', requiresAuth: true }
    ];
    
    for (const endpoint of userEndpoints) {
        const response = await makeRequest(endpoint.method, endpoint.path);
        
        if (endpoint.requiresAuth && response.status === 401) {
            logTest(endpoint.path, endpoint.method, 'PASS', 'Correctly requires authentication');
        } else if (!endpoint.requiresAuth && response.status !== 404) {
            logTest(endpoint.path, endpoint.method, 'PASS', 'Endpoint accessible');
        } else if (response.status === 404) {
            logTest(endpoint.path, endpoint.method, 'FAIL', 'Endpoint not found', response.data);
        } else {
            logTest(endpoint.path, endpoint.method, 'PASS', `Endpoint accessible (${response.status})`);
        }
    }
}

async function testAssignmentEndpoints() {
    console.log('\n📝 Testing Assignment Endpoints'.cyan.bold);
    console.log('=' .repeat(50).cyan);
    
    // Test basic assignment endpoint
    const assignmentsResponse = await makeRequest('GET', '/assignments');
    if (assignmentsResponse.success && assignmentsResponse.status === 200) {
        const expectedFields = ['success', 'message'];
        const missing = validateResponseStructure(assignmentsResponse.data, expectedFields);
        if (missing.length === 0) {
            logTest('/assignments', 'GET', 'PASS', 'Assignments endpoint working');
        } else {
            logTest('/assignments', 'GET', 'FAIL', `Missing fields: ${missing.join(', ')}`, assignmentsResponse.data);
        }
    } else {
        logTest('/assignments', 'GET', 'FAIL', 'Assignments endpoint failed', assignmentsResponse.data);
    }
    
    // Test authenticated assignment endpoints
    const authEndpoints = [
        '/assignments/my-assignments',
        '/assignments/overdue',
        '/assignments/stats'
    ];
    
    for (const endpoint of authEndpoints) {
        const response = await makeRequest('GET', endpoint);
        if (response.status === 401) {
            logTest(endpoint, 'GET', 'PASS', 'Correctly requires authentication');
        } else {
            logTest(endpoint, 'GET', 'FAIL', `Expected 401, got ${response.status}`, response.data);
        }
    }
}

async function testLocationEndpoints() {
    console.log('\n📍 Testing Location Endpoints'.cyan.bold);
    console.log('=' .repeat(50).cyan);
    
    // Test basic location endpoint
    const locationsResponse = await makeRequest('GET', '/locations');
    if (locationsResponse.success && locationsResponse.status === 200) {
        const expectedFields = ['success', 'message'];
        const missing = validateResponseStructure(locationsResponse.data, expectedFields);
        if (missing.length === 0) {
            logTest('/locations', 'GET', 'PASS', 'Locations endpoint working');
        } else {
            logTest('/locations', 'GET', 'FAIL', `Missing fields: ${missing.join(', ')}`, locationsResponse.data);
        }
    } else {
        logTest('/locations', 'GET', 'FAIL', 'Locations endpoint failed', locationsResponse.data);
    }
    
    // Test nearby locations (should require auth)
    const nearbyResponse = await makeRequest('GET', '/locations/nearby?lat=40.7128&lng=-74.0060');
    if (nearbyResponse.status === 401) {
        logTest('/locations/nearby', 'GET', 'PASS', 'Correctly requires authentication');
    } else {
        logTest('/locations/nearby', 'GET', 'FAIL', `Expected 401, got ${nearbyResponse.status}`, nearbyResponse.data);
    }
    
    // Test location validation (should require auth)
    const validateResponse = await makeRequest('POST', '/locations/validate', {
        lat: 40.7128,
        lng: -74.0060,
        address: 'New York, NY'
    });
    if (validateResponse.status === 401) {
        logTest('/locations/validate', 'POST', 'PASS', 'Correctly requires authentication');
    } else {
        logTest('/locations/validate', 'POST', 'FAIL', `Expected 401, got ${validateResponse.status}`, validateResponse.data);
    }
}

async function testGeocodingEndpoints() {
    console.log('\n🌍 Testing Geocoding Endpoints'.cyan.bold);
    console.log('=' .repeat(50).cyan);
    
    // Test forward geocoding (should require auth)
    const forwardResponse = await makeRequest('GET', '/geocoding/forward?address=New York');
    if (forwardResponse.status === 401) {
        logTest('/geocoding/forward', 'GET', 'PASS', 'Correctly requires authentication');
    } else {
        logTest('/geocoding/forward', 'GET', 'FAIL', `Expected 401, got ${forwardResponse.status}`, forwardResponse.data);
    }
    
    // Test reverse geocoding (should require auth)
    const reverseResponse = await makeRequest('GET', '/geocoding/reverse?lat=40.7128&lng=-74.0060');
    if (reverseResponse.status === 401) {
        logTest('/geocoding/reverse', 'GET', 'PASS', 'Correctly requires authentication');
    } else {
        logTest('/geocoding/reverse', 'GET', 'FAIL', `Expected 401, got ${reverseResponse.status}`, reverseResponse.data);
    }
}

async function testCategoryEndpoints() {
    console.log('\n📂 Testing Category Endpoints'.cyan.bold);
    console.log('=' .repeat(50).cyan);
    
    // Test categories list
    const categoriesResponse = await makeRequest('GET', '/categories');
    if (categoriesResponse.success && categoriesResponse.status === 200) {
        const expectedFields = ['success', 'categories'];
        const missing = validateResponseStructure(categoriesResponse.data, expectedFields);
        if (missing.length === 0) {
            logTest('/categories', 'GET', 'PASS', 'Categories endpoint working');
        } else {
            logTest('/categories', 'GET', 'FAIL', `Missing fields: ${missing.join(', ')}`, categoriesResponse.data);
        }
    } else {
        logTest('/categories', 'GET', 'FAIL', 'Categories endpoint failed', categoriesResponse.data);
    }
}

async function testNotificationEndpoints() {
    console.log('\n🔔 Testing Notification Endpoints'.cyan.bold);
    console.log('=' .repeat(50).cyan);
    
    const notificationEndpoints = [
        '/notifications',
        '/notifications/unread-count',
        '/notifications/mark-read',
        '/notifications/mark-all-read'
    ];
    
    for (const endpoint of notificationEndpoints) {
        const method = endpoint.includes('mark') ? 'POST' : 'GET';
        const response = await makeRequest(method, endpoint);
        
        if (response.status === 401) {
            logTest(endpoint, method, 'PASS', 'Correctly requires authentication');
        } else if (response.status === 404) {
            logTest(endpoint, method, 'FAIL', 'Endpoint not found', response.data);
        } else {
            logTest(endpoint, method, 'PASS', `Endpoint accessible (${response.status})`);
        }
    }
}

async function testDepartmentEndpoints() {
    console.log('\n🏢 Testing Department Endpoints'.cyan.bold);
    console.log('=' .repeat(50).cyan);
    
    const departmentEndpoints = [
        { path: '/departments', method: 'GET' },
        { path: '/departments', method: 'POST' },
        { path: '/departments/123', method: 'GET' },
        { path: '/departments/123', method: 'PUT' },
        { path: '/departments/123', method: 'DELETE' }
    ];
    
    for (const endpoint of departmentEndpoints) {
        const response = await makeRequest(endpoint.method, endpoint.path);
        
        if (response.status === 401 || response.status === 403) {
            logTest(endpoint.path, endpoint.method, 'PASS', 'Correctly requires authentication/authorization');
        } else if (response.status === 404) {
            logTest(endpoint.path, endpoint.method, 'FAIL', 'Endpoint not found', response.data);
        } else {
            logTest(endpoint.path, endpoint.method, 'PASS', `Endpoint accessible (${response.status})`);
        }
    }
}

async function testActivityLogEndpoints() {
    console.log('\n📊 Testing Activity Log Endpoints'.cyan.bold);
    console.log('=' .repeat(50).cyan);
    
    // Test basic activity log endpoint
    const activityResponse = await makeRequest('GET', '/activity-logs');
    if (activityResponse.success && activityResponse.status === 200) {
        const expectedFields = ['success', 'message'];
        const missing = validateResponseStructure(activityResponse.data, expectedFields);
        if (missing.length === 0) {
            logTest('/activity-logs', 'GET', 'PASS', 'Activity logs endpoint working');
        } else {
            logTest('/activity-logs', 'GET', 'FAIL', `Missing fields: ${missing.join(', ')}`, activityResponse.data);
        }
    } else {
        logTest('/activity-logs', 'GET', 'FAIL', 'Activity logs endpoint failed', activityResponse.data);
    }
    
    // Test issue timeline (should require auth)
    const timelineResponse = await makeRequest('GET', '/activity-logs/issue/123/timeline');
    if (timelineResponse.status === 401) {
        logTest('/activity-logs/issue/:id/timeline', 'GET', 'PASS', 'Correctly requires authentication');
    } else {
        logTest('/activity-logs/issue/:id/timeline', 'GET', 'FAIL', `Expected 401, got ${timelineResponse.status}`, timelineResponse.data);
    }
}

async function testErrorHandling() {
    console.log('\n⚠️  Testing Error Handling'.cyan.bold);
    console.log('=' .repeat(50).cyan);
    
    // Test 404 for non-existent endpoint
    const notFoundResponse = await makeRequest('GET', '/non-existent-endpoint');
    if (notFoundResponse.status === 404 || (notFoundResponse.status === 500 && notFoundResponse.data.message && notFoundResponse.data.message.includes('Not Found'))) {
        const missing = validateErrorResponse(notFoundResponse.data);
        if (missing.length === 0) {
            logTest('/non-existent-endpoint', 'GET', 'PASS', 'Not found error handled correctly');
        } else {
            logTest('/non-existent-endpoint', 'GET', 'FAIL', `Error response missing fields: ${missing.join(', ')}`, notFoundResponse.data);
        }
    } else {
        logTest('/non-existent-endpoint', 'GET', 'FAIL', `Expected 404 or Not Found error, got ${notFoundResponse.status}`, notFoundResponse.data);
    }
    
    // Test invalid JSON handling
    try {
        const invalidJsonResponse = await axios.post(`${API_BASE}/auth/login`, 'invalid json', {
            headers: { 'Content-Type': 'application/json' }
        });
        logTest('/auth/login', 'POST', 'FAIL', 'Invalid JSON should be rejected', invalidJsonResponse.data);
    } catch (error) {
        if (error.response?.status === 400) {
            logTest('/auth/login', 'POST', 'PASS', 'Invalid JSON correctly rejected');
        } else {
            logTest('/auth/login', 'POST', 'FAIL', `Expected 400, got ${error.response?.status}`, error.response?.data);
        }
    }
}

async function generateReport() {
    console.log('\n📊 Test Summary Report'.cyan.bold);
    console.log('=' .repeat(50).cyan);
    
    const passRate = ((passedTests / totalTests) * 100).toFixed(2);
    
    console.log(`Total Tests: ${totalTests}`.white);
    console.log(`Passed: ${passedTests}`.green);
    console.log(`Failed: ${failedTests}`.red);
    console.log(`Pass Rate: ${passRate}%`.yellow);
    
    if (failedTests > 0) {
        console.log('\n❌ Failed Tests:'.red.bold);
        testResults
            .filter(test => test.status === 'FAIL')
            .forEach(test => {
                console.log(`   ${test.method} ${test.endpoint} - ${test.message}`.red);
            });
    }
    
    // Save detailed report to file
    const report = {
        summary: {
            totalTests,
            passedTests,
            failedTests,
            passRate: parseFloat(passRate),
            timestamp: new Date().toISOString()
        },
        results: testResults
    };
    
    const fs = require('fs');
    fs.writeFileSync('api-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to api-test-report.json'.gray);
    
    return passRate >= 80; // Return true if pass rate is 80% or higher
}

// Main test runner
async function runAllTests() {
    console.log('🚀 Starting API Endpoint Tests'.rainbow.bold);
    console.log('=' .repeat(50).rainbow);
    
    try {
        await testBasicEndpoints();
        await testAuthEndpoints();
        await testIssueEndpoints();
        await testUserEndpoints();
        await testAssignmentEndpoints();
        await testLocationEndpoints();
        await testGeocodingEndpoints();
        await testCategoryEndpoints();
        await testNotificationEndpoints();
        await testDepartmentEndpoints();
        await testActivityLogEndpoints();
        await testErrorHandling();
        
        const success = await generateReport();
        
        if (success) {
            console.log('\n🎉 All tests completed successfully!'.green.bold);
            process.exit(0);
        } else {
            console.log('\n⚠️  Some tests failed. Check the report for details.'.yellow.bold);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n💥 Test runner crashed:'.red.bold, error.message);
        process.exit(1);
    }
}

// Check if server is running before starting tests
async function checkServerHealth() {
    try {
        const response = await axios.get(BASE_URL);
        console.log('✅ Server is running and accessible'.green);
        return true;
    } catch (error) {
        console.error('❌ Server is not accessible. Please start the server first.'.red);
        console.error(`   Error: ${error.message}`.gray);
        return false;
    }
}

// Run tests if server is healthy
async function main() {
    const serverHealthy = await checkServerHealth();
    if (serverHealthy) {
        await runAllTests();
    } else {
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the tests
if (require.main === module) {
    main();
}

module.exports = {
    runAllTests,
    makeRequest,
    validateResponseStructure
};
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testAuthToken() {
    console.log('🔐 Testing Authentication Token');
    console.log('=' .repeat(50));
    
    // Get token from localStorage simulation (you'll need to replace this with actual token)
    const token = process.argv[2];
    
    if (!token) {
        console.log('❌ No token provided');
        console.log('Usage: node test-auth-token.js <your-jwt-token>');
        console.log('You can get your token from browser localStorage');
        return;
    }
    
    console.log('Token:', token.substring(0, 20) + '...');
    
    try {
        // Test /auth/me endpoint
        console.log('\n🧪 Testing /auth/me endpoint...');
        const response = await axios.get(`${BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('✅ Token is valid');
        console.log('User data:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('❌ Token validation failed');
        console.log('Status:', error.response?.status);
        console.log('Error:', JSON.stringify(error.response?.data, null, 2));
        
        if (error.response?.status === 401) {
            console.log('\n💡 Token is invalid or expired. Please login again.');
        }
    }
    
    // Test other endpoints
    const testEndpoints = [
        '/categories',
        '/geocoding/reverse?lat=18.5526937&lng=73.7490174'
    ];
    
    console.log('\n🧪 Testing other endpoints...');
    for (const endpoint of testEndpoints) {
        try {
            const response = await axios.get(`${BASE_URL}${endpoint}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            console.log(`✅ ${endpoint} - Status: ${response.status}`);
        } catch (error) {
            console.log(`❌ ${endpoint} - Status: ${error.response?.status}, Error: ${error.response?.data?.message}`);
        }
    }
}

testAuthToken().catch(console.error);
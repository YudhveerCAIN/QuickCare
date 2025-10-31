const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testRegistration() {
    console.log('🧪 Testing Registration Endpoint');
    console.log('=' .repeat(50));
    
    // Test data that should pass validation
    const validTestData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'SecurePass123!',
        contact: '1234567890'
    };
    
    // Test data that should fail validation
    const invalidTestData = [
        {
            name: 'J', // Too short
            email: 'invalid-email',
            password: '123', // Too weak
            contact: '123' // Too short
        },
        {
            name: '', // Empty
            email: '',
            password: '',
            contact: ''
        },
        {
            // Missing required fields
            name: 'John Doe'
        }
    ];
    
    console.log('\n✅ Testing Valid Registration Data:');
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/register`, validTestData);
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('Status:', error.response?.status);
        console.log('Error Response:', JSON.stringify(error.response?.data, null, 2));
    }
    
    console.log('\n❌ Testing Invalid Registration Data:');
    for (let i = 0; i < invalidTestData.length; i++) {
        console.log(`\nTest ${i + 1}:`, JSON.stringify(invalidTestData[i], null, 2));
        try {
            const response = await axios.post(`${BASE_URL}/api/auth/register`, invalidTestData[i]);
            console.log('Unexpected Success - Status:', response.status);
            console.log('Response:', JSON.stringify(response.data, null, 2));
        } catch (error) {
            console.log('Expected Error - Status:', error.response?.status);
            console.log('Error Response:', JSON.stringify(error.response?.data, null, 2));
        }
    }
}

// Check if server is running
async function checkServer() {
    try {
        await axios.get(BASE_URL);
        console.log('✅ Server is running');
        return true;
    } catch (error) {
        console.log('❌ Server is not running. Please start the server first.');
        return false;
    }
}

async function main() {
    const serverRunning = await checkServer();
    if (serverRunning) {
        await testRegistration();
    }
}

main().catch(console.error);
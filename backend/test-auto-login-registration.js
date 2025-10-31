const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAutoLoginRegistration() {
    console.log('🧪 Testing Auto-Login Registration Flow');
    console.log('=' .repeat(50));
    
    // Test data for registration
    const testData = {
        name: 'John Doe',
        email: `test.user.${Date.now()}@example.com`, // Unique email
        password: 'SecurePass123!',
        contact: '1234567890'
    };
    
    console.log('\n📝 Registration Data:');
    console.log(JSON.stringify(testData, null, 2));
    
    try {
        console.log('\n🚀 Attempting Registration...');
        const response = await axios.post(`${BASE_URL}/api/auth/register`, testData);
        
        console.log('✅ Registration Response:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
        
        // Check if we got a token and user data
        if (response.data.token && response.data.user) {
            console.log('\n🎉 Auto-login successful!');
            console.log('Token received:', response.data.token ? 'Yes' : 'No');
            console.log('User data received:', response.data.user ? 'Yes' : 'No');
            console.log('User verified:', response.data.user.isVerified);
            
            // Test using the token to access a protected route
            console.log('\n🔐 Testing protected route access...');
            try {
                const protectedResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${response.data.token}`
                    }
                });
                console.log('✅ Protected route access successful');
                console.log('User from /me:', JSON.stringify(protectedResponse.data, null, 2));
            } catch (protectedError) {
                console.log('❌ Protected route access failed');
                console.log('Error:', protectedError.response?.data);
            }
        } else {
            console.log('\n⚠️  Traditional registration flow (no auto-login)');
        }
        
    } catch (error) {
        console.log('❌ Registration failed');
        console.log('Status:', error.response?.status);
        console.log('Error:', JSON.stringify(error.response?.data, null, 2));
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
        await testAutoLoginRegistration();
    }
}

main().catch(console.error);
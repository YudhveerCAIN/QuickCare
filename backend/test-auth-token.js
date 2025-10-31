const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAuthToken() {
    console.log('🔐 Testing Authentication Token');
    console.log('=' .repeat(50));
    
    // First, register a user to get a token
    const testUser = {
        name: 'Auth Test User',
        email: `auth.test.${Date.now()}@example.com`,
        password: 'TestPass123!',
        contact: '1234567890'
    };
    
    try {
        console.log('\n1. Registering user...');
        const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
        
        if (registerResponse.data.success && registerResponse.data.token) {
            const token = registerResponse.data.token;
            console.log('✅ Registration successful, token received');
            console.log('Token preview:', token.substring(0, 20) + '...');
            
            // Test the token with /auth/me
            console.log('\n2. Testing token with /auth/me...');
            try {
                const meResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                console.log('✅ /auth/me successful:', meResponse.data.success);
            } catch (meError) {
                console.log('❌ /auth/me failed:', meError.response?.status, meError.response?.data?.message);
            }
            
            // Test the token with POST /issues
            console.log('\n3. Testing token with POST /issues...');
            const issueData = {
                title: 'Test Issue',
                description: 'This is a test issue for authentication',
                category: JSON.stringify({ primary: 'road' }),
                priority: 'Medium',
                location: JSON.stringify({
                    address: 'Test Address',
                    coordinates: { lat: 18.5526973, lng: 73.7490142 }
                })
            };
            
            try {
                const issueResponse = await axios.post(`${BASE_URL}/api/issues`, issueData, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                console.log('✅ POST /issues successful:', issueResponse.data.success);
            } catch (issueError) {
                console.log('❌ POST /issues failed:', issueError.response?.status, issueError.response?.data?.message);
                console.log('Error details:', issueError.response?.data);
            }
            
        } else {
            console.log('❌ Registration failed or no token received');
        }
        
    } catch (error) {
        console.log('❌ Registration failed:', error.response?.data?.message || error.message);
    }
}

testAuthToken().catch(console.error);
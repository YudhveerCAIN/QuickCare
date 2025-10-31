// Debug script to test password reset token functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function debugResetToken() {
    try {
        console.log('🔍 Debugging password reset token...\n');
        
        // Step 1: Request password reset
        console.log('1. Requesting password reset for test email...');
        const forgotResponse = await axios.post(`${BASE_URL}/auth/forgot-password`, {
            email: 'test@example.com'
        });
        
        console.log('✅ Forgot password response:', forgotResponse.data);
        
        // Step 2: Try to verify a fake token to see the error format
        console.log('\n2. Testing token verification with fake token...');
        try {
            const verifyResponse = await axios.get(`${BASE_URL}/auth/verify-reset-token/fake-token-123`);
            console.log('❌ Should have failed:', verifyResponse.data);
        } catch (error) {
            console.log('✅ Expected error for fake token:', error.response?.data);
        }
        
        // Step 3: Check if we can get any info about token format
        console.log('\n3. Testing with properly formatted but invalid token...');
        const fakeToken = 'a'.repeat(64); // 64 character hex string
        try {
            const verifyResponse = await axios.get(`${BASE_URL}/auth/verify-reset-token/${fakeToken}`);
            console.log('❌ Should have failed:', verifyResponse.data);
        } catch (error) {
            console.log('✅ Expected error for fake 64-char token:', error.response?.data);
        }
        
    } catch (error) {
        console.error('❌ Debug error:', error.response?.data || error.message);
    }
}

// Run debug if this file is executed directly
if (require.main === module) {
    debugResetToken().catch(console.error);
}

module.exports = { debugResetToken };
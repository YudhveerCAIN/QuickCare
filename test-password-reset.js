// Simple test for password reset functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testForgotPassword() {
    try {
        console.log('Testing forgot password endpoint...');
        
        const response = await axios.post(`${BASE_URL}/auth/forgot-password`, {
            email: 'test@example.com'
        });
        
        console.log('✅ Forgot password response:', response.data);
        return true;
    } catch (error) {
        console.log('❌ Forgot password error:', error.response?.data || error.message);
        return false;
    }
}

async function testResetPasswordValidation() {
    try {
        console.log('Testing reset password validation...');
        
        const response = await axios.post(`${BASE_URL}/auth/reset-password`, {
            token: 'invalid-token',
            newPassword: 'short',
            confirmPassword: 'short'
        });
        
        console.log('❌ Should have failed with validation error');
        return false;
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('✅ Reset password validation working:', error.response.data.message);
            return true;
        }
        console.log('❌ Unexpected error:', error.response?.data || error.message);
        return false;
    }
}

async function runTests() {
    console.log('🧪 Testing Password Reset Functionality\n');
    
    const results = [];
    
    results.push(await testForgotPassword());
    results.push(await testResetPasswordValidation());
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log(`\n📊 Test Results: ${passed}/${total} passed`);
    
    if (passed === total) {
        console.log('🎉 All password reset tests passed!');
    } else {
        console.log('⚠️  Some tests failed. Check the backend server is running.');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testForgotPassword, testResetPasswordValidation };
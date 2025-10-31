const axios = require('axios');

async function testRegistrationScenarios() {
    const scenarios = [
        {
            name: 'Missing name field',
            data: {
                email: 'test1@example.com',
                password: 'TestPass123!',
                contact: '1234567890'
            }
        },
        {
            name: 'Missing email field',
            data: {
                name: 'Test User',
                password: 'TestPass123!',
                contact: '1234567890'
            }
        },
        {
            name: 'Missing password field',
            data: {
                name: 'Test User',
                email: 'test2@example.com',
                contact: '1234567890'
            }
        },
        {
            name: 'Missing contact field',
            data: {
                name: 'Test User',
                email: 'test3@example.com',
                password: 'TestPass123!'
            }
        },
        {
            name: 'Short name (1 char)',
            data: {
                name: 'T',
                email: 'test4@example.com',
                password: 'TestPass123!',
                contact: '1234567890'
            }
        },
        {
            name: 'Invalid email',
            data: {
                name: 'Test User',
                email: 'invalid-email',
                password: 'TestPass123!',
                contact: '1234567890'
            }
        },
        {
            name: 'Weak password',
            data: {
                name: 'Test User',
                email: 'test5@example.com',
                password: '123',
                contact: '1234567890'
            }
        },
        {
            name: 'Short contact',
            data: {
                name: 'Test User',
                email: 'test6@example.com',
                password: 'TestPass123!',
                contact: '123'
            }
        },
        {
            name: 'Empty strings',
            data: {
                name: '',
                email: '',
                password: '',
                contact: ''
            }
        },
        {
            name: 'Frontend typical data (firstName + lastName)',
            data: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                password: 'TestPass123!',
                phone: '1234567890'
            }
        }
    ];

    for (const scenario of scenarios) {
        try {
            console.log(`\n🧪 Testing: ${scenario.name}`);
            console.log('Data:', JSON.stringify(scenario.data, null, 2));
            
            const response = await axios.post('http://localhost:3001/api/auth/register', scenario.data);
            console.log('✅ Success:', response.data.message);
            
        } catch (error) {
            console.log('❌ Failed:');
            console.log('Status:', error.response?.status);
            if (error.response?.data?.errors) {
                console.log('Validation Errors:');
                error.response.data.errors.forEach(err => console.log(`  - ${err}`));
            } else {
                console.log('Response:', JSON.stringify(error.response?.data, null, 2));
            }
        }
    }
}

testRegistrationScenarios();
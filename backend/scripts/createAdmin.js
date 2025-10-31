const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');

// Load .env from the backend directory (parent of scripts)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const createDefaultAdmin = async () => {
    try {
        // Debug: Check if MONGO_URL is loaded
        console.log('MONGO_URL:', process.env.MONGO_URL ? 'Found' : 'Not found');
        
        if (!process.env.MONGO_URL) {
            throw new Error('MONGO_URL not found in environment variables');
        }

        // Connect to database
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@quickcare.com' });
        if (existingAdmin) {
            console.log('Admin user already exists!');
            console.log('Email: admin@quickcare.com');
            console.log('Password: admin123');
            process.exit(0);
        }

        // Create default admin user
        const adminUser = await User.create({
            name: 'System Administrator',
            email: 'admin@quickcare.com',
            password: 'admin123',
            contact: '1234567890',
            role: 'system_admin',
            department: 'System Administration',
            employeeId: 'ADMIN001',
            isActive: true,
            isVerified: true,
            address: {
                street: 'Admin Street',
                city: 'Admin City',
                state: 'Admin State',
                zipCode: '12345',
                country: 'India'
            }
        });

        console.log('✅ Default admin user created successfully!');
        console.log('📧 Email: admin@quickcare.com');
        console.log('🔑 Password: admin123');
        console.log('👤 Role: System Administrator');
        console.log('');
        console.log('⚠️  IMPORTANT: Change the password after first login!');

    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

createDefaultAdmin();

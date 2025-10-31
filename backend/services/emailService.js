const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    async initializeTransporter() {
        // Check if real email credentials are provided
        const hasRealEmailConfig = process.env.EMAIL_USER && 
                                  process.env.EMAIL_PASSWORD && 
                                  process.env.EMAIL_USER !== 'your-email@gmail.com';

        if (process.env.NODE_ENV === 'production' || hasRealEmailConfig) {
            // Use real email service (Gmail, SendGrid, AWS SES, etc.)
            this.transporter = nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE || 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });
            console.log(`Email service initialized with ${process.env.EMAIL_SERVICE || 'gmail'} for ${process.env.EMAIL_USER}`);
        } else {
            // Development configuration - create test account automatically
            console.log('No real email credentials found, using Ethereal test service');
            await this.setupTestAccount();
        }
    }

    async setupTestAccount() {
        try {
            // Create a test account using Ethereal Email
            const testAccount = await nodemailer.createTestAccount();
            
            this.transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });

            console.log('Test email account created:', {
                user: testAccount.user,
                pass: testAccount.pass,
                smtp: 'smtp.ethereal.email:587'
            });
        } catch (error) {
            console.error('Failed to create test email account:', error);
            // Fallback to a simple configuration for development
            this.transporter = nodemailer.createTransport({
                streamTransport: true,
                newline: 'unix',
                buffer: true
            });
        }
    }

    async sendOTPEmail(email, otp, type = 'registration') {
        try {
            const subject = this.getSubjectByType(type);
            const htmlContent = this.getHTMLContentByType(otp, type);
            const textContent = this.getTextContentByType(otp, type);

            const mailOptions = {
                from: process.env.EMAIL_FROM || 'QuickCare <noreply@quickcare.com>',
                to: email,
                subject: subject,
                text: textContent,
                html: htmlContent
            };

            const info = await this.transporter.sendMail(mailOptions);
            
            console.log('OTP email sent successfully:', {
                messageId: info.messageId,
                email: email,
                type: type,
                preview: nodemailer.getTestMessageUrl(info) // Only works with Ethereal
            });

            return {
                success: true,
                messageId: info.messageId,
                previewUrl: nodemailer.getTestMessageUrl(info)
            };
        } catch (error) {
            console.error('Error sending OTP email:', error);
            throw new Error('Failed to send OTP email');
        }
    }

    async sendPasswordResetEmail(email, resetToken, resetUrl) {
        try {
            const subject = 'QuickCare - Password Reset Request';
            const htmlContent = this.getPasswordResetHTML(resetUrl);
            const textContent = this.getPasswordResetText(resetUrl);

            const mailOptions = {
                from: process.env.EMAIL_FROM || 'QuickCare <noreply@quickcare.com>',
                to: email,
                subject: subject,
                text: textContent,
                html: htmlContent
            };

            const info = await this.transporter.sendMail(mailOptions);
            
            console.log('Password reset email sent successfully:', {
                messageId: info.messageId,
                email: email,
                preview: nodemailer.getTestMessageUrl(info)
            });

            return {
                success: true,
                messageId: info.messageId,
                previewUrl: nodemailer.getTestMessageUrl(info)
            };
        } catch (error) {
            console.error('Error sending password reset email:', error);
            throw new Error('Failed to send password reset email');
        }
    }

    getSubjectByType(type) {
        const subjects = {
            registration: 'QuickCare - Verify Your Email Address',
            password_reset: 'QuickCare - Password Reset Verification',
            email_change: 'QuickCare - Verify Your New Email Address'
        };
        return subjects[type] || 'QuickCare - Email Verification';
    }

    getHTMLContentByType(otp, type) {
        const messages = {
            registration: {
                title: 'Welcome to QuickCare!',
                message: 'Thank you for registering with QuickCare. Please verify your email address to complete your registration.',
                action: 'Complete Registration'
            },
            password_reset: {
                title: 'Password Reset Request',
                message: 'You have requested to reset your password. Please use the OTP below to proceed.',
                action: 'Reset Password'
            },
            email_change: {
                title: 'Email Address Change',
                message: 'You have requested to change your email address. Please verify your new email address.',
                action: 'Verify Email'
            }
        };

        const content = messages[type] || messages.registration;

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${content.title}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #f9f9f9; }
                .otp-box { background: white; border: 2px solid #2196F3; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
                .otp-code { font-size: 32px; font-weight: bold; color: #2196F3; letter-spacing: 8px; }
                .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
                .warning { color: #f44336; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>${content.title}</h1>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>${content.message}</p>
                    
                    <div class="otp-box">
                        <p>Your verification code is:</p>
                        <div class="otp-code">${otp}</div>
                    </div>
                    
                    <p><strong>Important:</strong></p>
                    <ul>
                        <li>This code will expire in <strong>5 minutes</strong></li>
                        <li>You have <strong>3 attempts</strong> to enter the correct code</li>
                        <li>Do not share this code with anyone</li>
                    </ul>
                    
                    <p class="warning">If you didn't request this verification, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>© 2024 QuickCare. All rights reserved.</p>
                    <p>This is an automated message, please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getTextContentByType(otp, type) {
        const messages = {
            registration: 'Welcome to QuickCare! Please verify your email address to complete registration.',
            password_reset: 'You have requested to reset your password. Use the OTP below to proceed.',
            email_change: 'You have requested to change your email address. Please verify your new email.'
        };

        const message = messages[type] || messages.registration;

        return `
        ${message}

        Your verification code is: ${otp}

        Important:
        - This code will expire in 5 minutes
        - You have 3 attempts to enter the correct code
        - Do not share this code with anyone

        If you didn't request this verification, please ignore this email.

        © 2024 QuickCare. All rights reserved.
        `;
    }

    getPasswordResetHTML(resetUrl) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Request</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #f9f9f9; }
                .button { display: inline-block; background: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
                .warning { color: #f44336; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>You have requested to reset your password for your QuickCare account.</p>
                    
                    <p>Click the button below to reset your password:</p>
                    <a href="${resetUrl}" class="button">Reset Password</a>
                    
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all;">${resetUrl}</p>
                    
                    <p><strong>Important:</strong></p>
                    <ul>
                        <li>This link will expire in <strong>1 hour</strong></li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>Your password will not be changed until you click the link above</li>
                    </ul>
                </div>
                <div class="footer">
                    <p>© 2024 QuickCare. All rights reserved.</p>
                    <p>This is an automated message, please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getPasswordResetText(resetUrl) {
        return `
        Password Reset Request

        You have requested to reset your password for your QuickCare account.

        Click the link below to reset your password:
        ${resetUrl}

        Important:
        - This link will expire in 1 hour
        - If you didn't request this reset, please ignore this email
        - Your password will not be changed until you click the link above

        © 2024 QuickCare. All rights reserved.
        `;
    }

    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('Email service connection verified successfully');
            return true;
        } catch (error) {
            console.error('Email service connection failed:', error);
            return false;
        }
    }
}

module.exports = new EmailService();
const nodemailer = require('nodemailer');

// Create SMTP transporter for Amazon SES
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SES_SMTP_HOST || 'email-smtp.ap-south-1.amazonaws.com',
        port: parseInt(process.env.SES_SMTP_PORT) || 587,
        secure: false, // Use TLS
        auth: {
            user: process.env.SES_SMTP_USER,
            pass: process.env.SES_SMTP_PASSWORD
        }
    });
};

/**
 * Send school credentials email
 * @param {string} email - School's email address
 * @param {string} schoolName - Name of the school
 * @param {string} password - Generated password
 * @param {string} loginUrl - URL to login page
 * @returns {Promise<boolean>} - Success status
 */
const sendSchoolCredentialsEmail = async (email, schoolName, password, loginUrl) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"JaagrMind" <${process.env.SES_FROM_EMAIL || 'noreply@jaagrmind.com'}>`,
            to: email,
            subject: 'Welcome to JaagrMind - Your Login Credentials',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #6366f1; margin: 0;">JaagrMind</h1>
                        <p style="color: #64748b; margin: 5px 0;">Student Mental Wellness Platform</p>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
                        <h2 style="color: #1e293b; margin-top: 0;">Welcome, ${schoolName}!</h2>
                        <p style="color: #475569;">Your school account has been created on JaagrMind. Here are your login credentials:</p>
                        
                        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #6366f1;">
                            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
                            <p style="margin: 0;"><strong>Password:</strong> <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${password}</code></p>
                        </div>
                        
                        <p style="color: #dc2626; font-weight: 500;">⚠️ You will be required to change your password on first login.</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Login to JaagrMind</a>
                    </div>
                    
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; color: #64748b; font-size: 14px;">
                        <p>If you have any questions, please contact our support team.</p>
                        <p style="margin-bottom: 0;">© ${new Date().getFullYear()} JaagrMind. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Credentials email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending credentials email:', error);
        return false;
    }
};

/**
 * Send password changed notification email
 * @param {string} email - School's email address
 * @param {string} schoolName - Name of the school
 * @returns {Promise<boolean>} - Success status
 */
const sendPasswordChangedEmail = async (email, schoolName) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"JaagrMind" <${process.env.SES_FROM_EMAIL || 'noreply@jaagrmind.com'}>`,
            to: email,
            subject: 'JaagrMind - Password Changed Successfully',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #6366f1; margin: 0;">JaagrMind</h1>
                    </div>
                    
                    <div style="background: #f0fdf4; border-radius: 12px; padding: 30px; border: 1px solid #86efac;">
                        <h2 style="color: #166534; margin-top: 0;">✓ Password Changed</h2>
                        <p style="color: #15803d;">Hello ${schoolName},</p>
                        <p style="color: #15803d;">Your password has been successfully changed. If you did not make this change, please contact support immediately.</p>
                    </div>
                    
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; color: #64748b; font-size: 14px;">
                        <p style="margin-bottom: 0;">© ${new Date().getFullYear()} JaagrMind. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Password change notification sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending password changed email:', error);
        return false;
    }
};

module.exports = {
    sendSchoolCredentialsEmail,
    sendPasswordChangedEmail
};

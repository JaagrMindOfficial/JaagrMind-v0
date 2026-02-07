const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendEmail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME || 'JaagrMind Support'}" <${process.env.SMTP_FROM_EMAIL}>`,
            to,
            subject,
            html
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        // Don't throw error to prevent blocking main execution flow
        return null;
    }
};

const sendTicketCreatedEmail = async (school, ticket) => {
    // 1. Send Notification to Admin/Support
    // We set Reply-To to the school's email so support can reply directly
    const supportSubject = `New Ticket from ${school.name}: ${ticket.subject}`;
    const supportHtml = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>New Support Ticket</h2>
            <p><strong>School:</strong> ${school.name}</p>
            <p><strong>Email:</strong> ${school.email}</p>
            <p><strong>Ticket ID:</strong> ${ticket._id}</p>
            <hr>
            <p><strong>Subject:</strong> ${ticket.subject}</p>
            <p><strong>Category:</strong> ${ticket.category}</p>
            <p><strong>Priority:</strong> ${ticket.priority}</p>
            <p><strong>Message:</strong></p>
            <blockquote style="background: #f9f9f9; padding: 10px; border-left: 4px solid #8B5CF6;">
                ${ticket.message}
            </blockquote>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: `"${school.name} (via JaagrMind)" <${process.env.SMTP_FROM_EMAIL}>`,
            to: process.env.SMTP_USER, // Send to support email
            replyTo: school.email,     // Allow direct reply to school
            subject: supportSubject,
            html: supportHtml
        });
        console.log('Support notification sent for ticket:', ticket._id);
    } catch (error) {
        console.error('Error sending support notification:', error);
    }

    // 2. Send Confirmation to School
    const schoolSubject = `Ticket Received: ${ticket.subject}`;
    const schoolHtml = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Ticket Received</h2>
            <p>Hello ${school.name},</p>
            <p>Thank you for contacting JaagrMind Support. We have received your request and a member of our team will review it shortly.</p>
            <hr>
            <p><strong>Ticket ID:</strong> ${ticket._id}</p>
            <p><strong>Subject:</strong> ${ticket.subject}</p>
            <p><strong>Message:</strong></p>
            <blockquote style="background: #f9f9f9; padding: 10px; border-left: 4px solid #8B5CF6;">
                ${ticket.message}
            </blockquote>
            <hr>
            <p>You can view the status of your ticket in your dashboard.</p>
            <p>Best regards,<br>JaagrMind Support Team</p>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME || 'JaagrMind Support'}" <${process.env.SMTP_FROM_EMAIL}>`,
            to: school.email,
            subject: schoolSubject,
            html: schoolHtml
        });
        console.log('School confirmation sent for ticket:', ticket._id);
    } catch (error) {
        console.error('Error sending school confirmation:', error);
    }
};

const sendTicketStatusUpdateEmail = async (ticket, newStatus) => {
    const schoolEmail = ticket.school.email;
    const schoolName = ticket.school.name;
    const ticketId = ticket._id.toString().slice(-6);

    let subject = `[Ticket Update] ${ticket.subject} is now ${newStatus}`;
    let html = '';

    if (newStatus === 'resolved') {
        subject = `[Resolved] Ticket #${ticketId}: ${ticket.subject}`;
        html = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2>Ticket Resolved</h2>
                <p>Hello ${schoolName},</p>
                <p>We are pleased to inform you that your support ticket <strong>#${ticketId}</strong> has been marked as <strong>RESOLVED</strong>.</p>
                <p><strong>Subject:</strong> ${ticket.subject}</p>
                <hr>
                <p>If you believe this issue is not resolved, or if you have further questions, you can reply to this email or reopen the ticket from your dashboard.</p>
                <p><a href="${process.env.FRONTEND_URL}/school/support" style="background-color: #8B5CF6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Ticket</a></p>
                <br>
                <p>Thank you for using JaagrMind.</p>
                <p>Best regards,<br>JaagrMind Support Team</p>
            </div>
        `;
    } else {
        html = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2>Ticket Status Updated</h2>
                <p>Hello ${schoolName},</p>
                <p>The status of your ticket <strong>#${ticketId}</strong> has been updated to <strong>${newStatus.toUpperCase()}</strong>.</p>
                <p><strong>Subject:</strong> ${ticket.subject}</p>
                <p><a href="${process.env.FRONTEND_URL}/school/support">Click here to view your ticket</a></p>
                <p>Best regards,<br>JaagrMind Support Team</p>
            </div>
        `;
    }

    await sendEmail(schoolEmail, subject, html);
};

const sendContactFormConfirmationEmail = async (name, email, subject, message) => {
    const confirmationSubject = `We received your message: ${subject}`;
    const confirmationHtml = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Thank You for Contacting Us</h2>
            <p>Hello ${name},</p>
            <p>We have received your message regarding "<strong>${subject}</strong>".</p>
            <p>Our team will review your inquiry and get back to you as soon as possible.</p>
            <hr>
            <p><strong>Your Message:</strong></p>
            <blockquote style="background: #f9f9f9; padding: 10px; border-left: 4px solid #8B5CF6;">
                ${message}
            </blockquote>
            <hr>
            <p>Best regards,<br>JaagrMind Team</p>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME || 'JaagrMind'}" <${process.env.SMTP_FROM_EMAIL}>`,
            to: email,
            subject: confirmationSubject,
            html: confirmationHtml
        });
        console.log('Contact form confirmation sent to:', email);
    } catch (error) {
        console.error('Error sending contact form confirmation:', error);
    }
};

const sendSchoolCredentialsEmail = async (email, name, password, loginUrl) => {
    const subject = 'Welcome to JaagrMind - Your Login Credentials';
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Welcome to JaagrMind!</h2>
            <p>Hello <strong>${name}</strong>,</p>
            <p>Your school account has been successfully created. Below are your login credentials:</p>
            
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #8B5CF6; margin: 20px 0;">
                <p><strong>Login URL:</strong> <a href="${loginUrl}" style="color: #8B5CF6;">${loginUrl}</a></p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Password:</strong> ${password}</p>
            </div>

            <p>Please log in and change your password immediately for security purposes.</p>
            <hr>
            <p>If you have any questions or need support, please reply to this email.</p>
            <p>Best regards,<br>JaagrMind Team</p>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME || 'JaagrMind'}" <${process.env.SMTP_FROM_EMAIL}>`,
            to: email,
            subject: subject,
            html: html
        });
        console.log('Credentials email sent to:', email);
        return true;
    } catch (error) {
        console.error('Error sending credentials email:', error);
        return false;
    }
};

const sendPasswordChangedEmail = async (email, name) => {
    const subject = 'Your Password Was Changed';
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Password Changed Successfully</h2>
            <p>Hello <strong>${name}</strong>,</p>
            <p>This email is to confirm that the password for your JaagrMind account has been successfully changed.</p>
            <p>If you did not make this change, please contact support immediately.</p>
            <hr>
            <p>Best regards,<br>JaagrMind Team</p>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME || 'JaagrMind'}" <${process.env.SMTP_FROM_EMAIL}>`,
            to: email,
            subject: subject,
            html: html
        });
        console.log('Password changed email sent to:', email);
        return true;
    } catch (error) {
        console.error('Error sending password changed email:', error);
        return false;
    }
};

module.exports = {
    sendEmail,
    sendTicketCreatedEmail,
    sendTicketStatusUpdateEmail,
    sendContactFormConfirmationEmail,
    sendSchoolCredentialsEmail,
    sendPasswordChangedEmail
};

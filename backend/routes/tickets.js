const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const School = require('../models/School');
const { protect } = require('../middleware/auth');
const { sendTicketCreatedEmail, sendTicketStatusUpdateEmail, sendEmail, sendContactFormConfirmationEmail } = require('../utils/emailService');

// ... (lines 8-94 remain unchanged)

// @desc    Get tickets (School sees own, Admin sees all)
// @route   GET /api/tickets
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let tickets;
        if (req.user.role === 'admin') {
            tickets = await Ticket.find()
                .populate('school', 'name email schoolId')
                .sort({ createdAt: -1 });
        } else {
            tickets = await Ticket.find({ school: req.user.id }).sort({ createdAt: -1 });
        }
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Create a new ticket
// @route   POST /api/tickets
// @access  Private (School)
router.post('/', protect, async (req, res) => {
    try {
        const { subject, category, priority, message } = req.body;

        const ticket = new Ticket({
            school: req.user.id,
            subject,
            category,
            priority,
            message,
            status: 'pending'
        });

        const createdTicket = await ticket.save();

        // Fetch school details for email
        const school = await School.findById(req.user.id);
        if (school) {
            await sendTicketCreatedEmail(school, createdTicket);
        }

        res.status(201).json(createdTicket);
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Public Contact Form (Home Page)
// @route   POST /api/tickets/public
// @access  Public
router.post('/public', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        const html = `
            <h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <blockquote>${message}</blockquote>
        `;

        // Send to Support
        await sendEmail(process.env.SMTP_USER, `Contact Form: ${subject}`, html);

        // Send Confirmation to User
        if (email) {
            await sendContactFormConfirmationEmail(name, email, subject, message);
        }

        res.status(200).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending contact form:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private (Admin or Ticket Owner)
router.get('/:id', protect, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id).populate('school', 'name email schoolId');

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Check authorization
        if (req.user.role !== 'admin' && ticket.school._id.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        res.json(ticket);
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Add response to ticket
// @route   POST /api/tickets/:id/respond
// @access  Private (Admin or Ticket Owner)
router.post('/:id/respond', protect, async (req, res) => {
    try {
        const { message } = req.body;
        const ticket = await Ticket.findById(req.params.id).populate('school', 'name email');

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Check authorization
        if (req.user.role !== 'admin' && ticket.school._id.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const sender = req.user.role === 'admin' ? 'admin' : 'school';

        // Add response
        ticket.responses.push({
            sender,
            message,
            timestamp: new Date()
        });

        // Update status if needed (e.g. if school replies, maybe re-open?)
        if (sender === 'school' && ticket.status === 'resolved') {
            ticket.status = 'in-progress';
        }

        await ticket.save();

        // Send Email Notification
        if (sender === 'admin') {
            // Notify School
            const subject = `Reply to Ticket: ${ticket.subject}`;
            const html = `
                <p>Hello ${ticket.school.name},</p>
                <p>Support has replied to your ticket:</p>
                <blockquote>${message}</blockquote>
                <p>Login to your dashboard to view the full conversation.</p>
            `;
            await sendEmail(ticket.school.email, subject, html);
        } else {
            // Notify Admin
            const subject = `Reply from ${ticket.school.name}: ${ticket.subject}`;
            const html = `
                <p>New reply from ${ticket.school.name}:</p>
                <blockquote>${message}</blockquote>
            `;
            await sendEmail(process.env.SMTP_USER, subject, html);
        }

        res.json(ticket);
    } catch (error) {
        console.error('Error responding to ticket:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Update ticket status
// @route   PATCH /api/tickets/:id/status
// @access  Private (Admin Only)
router.patch('/:id/status', protect, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { status } = req.body;
        const validStatuses = ['pending', 'in-progress', 'resolved'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const ticket = await Ticket.findById(req.params.id).populate('school', 'name email');

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const oldStatus = ticket.status;
        ticket.status = status;
        await ticket.save();

        // Notify School of status change
        if (oldStatus !== status) {
            await sendTicketStatusUpdateEmail(ticket, status);
        }

        res.json(ticket);
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Admin: Get all tickets
// @route   GET /api/tickets/all
// @access  Private (Admin)
router.get('/all', protect, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // This likely overlaps with what AdminDashboard expects, 
        // but often Admin uses /api/tickets if they are sharing the route?
        // Wait, looking at AdminTickets.jsx line 36: api.get('/api/tickets')
        // But routes/tickets.js line 13 filters by req.user.id!
        // Admin needs a route to see ALL tickets.
        // I will MODIFY the existing GET / to handle Admin role too.

        const tickets = await Ticket.find().populate('school', 'name email').sort({ createdAt: -1 });
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching all tickets:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;

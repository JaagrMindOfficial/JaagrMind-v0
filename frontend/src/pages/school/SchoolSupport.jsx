import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faHeadset, faEnvelope, faPhone, faClock, faTicket, faTimes } from '@fortawesome/free-solid-svg-icons';
import Layout from '../../components/common/Layout';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useToast } from "../../components/common/Toast";

const SchoolSupport = () => {
    const toast = useToast();
    const { theme } = useTheme();
    // token is no longer needed here as api.js handles it
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        subject: '',
        category: 'general',
        priority: 'medium',
        message: ''
    });
    const [tickets, setTickets] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyMessage, setReplyMessage] = useState('');

    // Use relative path or rely on api.js baseURL
    // API_URL is handled by api.js baseURL if configured, but here we can just use relative paths 
    // or keep using API_URL if it's full path. api.js usually handles base URL.
    // Let's assume api.js handles the base part if we pass relative path, 
    // OR we can pass full path. 
    // Looking at api.js, it uses API_BASE_URL.

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            // No config needed, api interceptor adds token
            const response = await api.get('/api/tickets');
            setTickets(response.data);
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching tickets:', error);
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await api.post('/api/tickets', formData);

            setSubmitted(true);
            setFormData({ subject: '', category: 'general', priority: 'medium', message: '' });
            fetchTickets(); // Refresh list
            toast.success('Ticket submitted successfully!');

            // Reset success message after 5 seconds
            setTimeout(() => setSubmitted(false), 5000);
        } catch (error) {
            console.error('Error submitting ticket:', error);
            toast.error(error.response?.data?.message || 'Failed to submit ticket');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <span className="badge badge-warning">Pending</span>;
            case 'in-progress':
                return <span className="badge badge-info">In Progress</span>;
            case 'resolved':
                return <span className="badge badge-success">Resolved</span>;
            default:
                return <span className="badge">{status}</span>;
        }
    };

    const handleTicketSelect = async (ticket) => {
        try {
            // Fetch full details including responses
            const response = await api.get(`/api/tickets/${ticket._id}`);
            setSelectedTicket(response.data);
        } catch (error) {
            console.error('Error fetching ticket details:', error);
            toast.error('Failed to load ticket details');
        }
    };

    const handleSendReply = async () => {
        if (!replyMessage.trim() || !selectedTicket) return;

        try {
            const response = await api.post(`/api/tickets/${selectedTicket._id}/respond`, {
                message: replyMessage
            });

            // Refresh selected ticket
            setSelectedTicket(response.data);
            setReplyMessage('');
            toast.success('Reply sent successfully');
        } catch (error) {
            console.error('Error sending reply:', error);
            toast.error('Failed to send reply');
        }
    };

    return (
        <Layout title="Support & Help" subtitle="Get assistance or report issues">
            <div className="grid grid-3" style={{ position: 'relative', zIndex: 1 }}>
                {/* Contact Form - Always Spans 2 columns */}
                <div style={{ gridColumn: 'span 2' }}>
                    <motion.div
                        className="card mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="card-header">
                            <h3 className="card-title">
                                <FontAwesomeIcon icon={faHeadset} className="mr-2" style={{ marginRight: '10px', color: 'var(--primary-purple)' }} />
                                Submit a Ticket
                            </h3>
                        </div>

                        {submitted ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-8 text-center"
                                style={{ padding: '40px', textAlign: 'center' }}
                            >
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 20px auto',
                                    color: 'var(--success)',
                                    fontSize: '2rem'
                                }}>
                                    ✓
                                </div>
                                <h3 style={{ marginBottom: '10px' }}>Ticket Submitted Successfully!</h3>
                                <p>We have received your request and will get back to you shortly.</p>
                                <button
                                    className="btn btn-primary mt-6"
                                    onClick={() => setSubmitted(false)}
                                    style={{ marginTop: '24px' }}
                                >
                                    Submit Another Ticket
                                </button>
                            </motion.div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <div className="grid grid-2" style={{ marginBottom: '20px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Subject</label>
                                        <input
                                            type="text"
                                            name="subject"
                                            className="form-input"
                                            placeholder="Brief description of the issue"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Category</label>
                                        <select
                                            name="category"
                                            className="form-input"
                                            value={formData.category}
                                            onChange={handleChange}
                                        >
                                            <option value="general">General Inquiry</option>
                                            <option value="technical">Technical Issue</option>
                                            <option value="billing">Billing & Account</option>
                                            <option value="feature">Feature Request</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Priority</label>
                                    <div className="flex gap-4" style={{ display: 'flex', gap: '16px' }}>
                                        {['low', 'medium', 'high'].map((p) => (
                                            <label
                                                key={p}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    cursor: 'pointer',
                                                    padding: '10px 16px',
                                                    borderRadius: '8px',
                                                    background: formData.priority === p ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                                                    border: formData.priority === p ? '1px solid var(--primary-purple)' : '1px solid var(--text-light)',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <input
                                                    type="radio"
                                                    name="priority"
                                                    value={p}
                                                    checked={formData.priority === p}
                                                    onChange={handleChange}
                                                    style={{ accentColor: 'var(--primary-purple)' }}
                                                />
                                                <span style={{ textTransform: 'capitalize', fontWeight: formData.priority === p ? 600 : 400 }}>
                                                    {p}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Message</label>
                                    <textarea
                                        name="message"
                                        className="form-input"
                                        rows="6"
                                        placeholder="Please provide detailed information about your request..."
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                    ></textarea>
                                </div>

                                <div className="flex justify-end" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>Please wait...</>
                                        ) : (
                                            <>
                                                <FontAwesomeIcon icon={faPaperPlane} /> Send Ticket
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </motion.div>

                    {/* Ticket History */}
                    <motion.div
                        className="card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <div className="card-header">
                            <h3 className="card-title">
                                <FontAwesomeIcon icon={faTicket} className="mr-2" style={{ marginRight: '10px', color: 'var(--primary-purple)' }} />
                                Your Tickets
                            </h3>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <div className="spinner"></div>
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="text-center p-8 text-muted">
                                <p>No tickets submit yet.</p>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Subject</th>
                                            <th>Category</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tickets.map((ticket) => (
                                            <tr key={ticket._id} onClick={() => handleTicketSelect(ticket)} style={{ cursor: 'pointer', background: selectedTicket?._id === ticket._id ? 'var(--primary-bg)' : 'transparent' }}>
                                                <td>{ticket.subject}</td>
                                                <td style={{ textTransform: 'capitalize' }}>{ticket.category}</td>
                                                <td>{getStatusBadge(ticket.status)}</td>
                                                <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                                                <td>
                                                    <button className="btn-icon" title="View Details" style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '8px',
                                                        background: 'var(--primary-purple)',
                                                        color: 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                        <FontAwesomeIcon icon={faTicket} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Right Column Area - Contact Info & Urgent Help - Always Visible */}
                <div>
                    <motion.div
                        className="card mb-4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        style={{ marginBottom: '24px' }}
                    >
                        <h3 className="card-title mb-4" style={{ marginBottom: '16px' }}>Contact Information</h3>

                        <div className="flex flex-col gap-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="flex items-start gap-3" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{
                                    width: '36px', height: '36px',
                                    background: 'var(--primary-bg)',
                                    borderRadius: '8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--primary-purple)'
                                }}>
                                    <FontAwesomeIcon icon={faEnvelope} />
                                </div>
                                <div>
                                    <h5 style={{ marginBottom: '4px' }}>Email Us</h5>
                                    <p style={{ fontSize: '0.9rem' }}>support@jaagrmind.com</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{
                                    width: '36px', height: '36px',
                                    background: 'var(--primary-bg)',
                                    borderRadius: '8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--primary-purple)'
                                }}>
                                    <FontAwesomeIcon icon={faPhone} />
                                </div>
                                <div>
                                    <h5 style={{ marginBottom: '4px' }}>Call Us</h5>
                                    <p style={{ fontSize: '0.9rem' }}>+91-78200-01282</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{
                                    width: '36px', height: '36px',
                                    background: 'var(--primary-bg)',
                                    borderRadius: '8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--primary-purple)'
                                }}>
                                    <FontAwesomeIcon icon={faClock} />
                                </div>
                                <div>
                                    <h5 style={{ marginBottom: '4px' }}>Support Hours</h5>
                                    <p style={{ fontSize: '0.9rem' }}>Mon - Fri: 9AM - 6PM IST (GMT +5:30)</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        className="card"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        style={{
                            background: 'linear-gradient(135deg, var(--primary-purple) 0%, var(--primary-purple-dark) 100%)',
                            color: 'white'
                        }}
                    >
                        <h3 style={{ color: 'white', marginBottom: '12px' }}>Need Urgent Help?</h3>
                        <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '16px' }}>
                            For critical issues affecting exams in progress, please use our emergency hotline.
                        </p>
                        <button className="btn" style={{ background: 'white', color: 'var(--primary-purple)', width: '100%' }}>
                            Call Emergency Line
                        </button>
                    </motion.div>
                </div>
            </div>

            {/* Ticket Details Modal Overlay */}
            {selectedTicket && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(30, 50, 100, 0.5)', // Semi-blue transparent backdrop
                    backdropFilter: 'blur(4px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem'
                }} onClick={() => setSelectedTicket(null)}>
                    <motion.div
                        className="card"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        style={{
                            width: '100%',
                            maxWidth: '800px',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden', // No scroll on main container
                            position: 'relative',
                            margin: '0 auto',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            padding: 0 // Reset padding as we'll add it to sections
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Fixed Header Section */}
                        <div style={{
                            padding: '16px',
                            borderBottom: '1px solid var(--border-color)',
                            background: 'inherit',
                            flexShrink: 0
                        }}>
                            <div className="flex justify-between items-start mb-2" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <h3 className="card-title" style={{ fontSize: '1.2rem', marginBottom: 0 }}>Ticket Details</h3>
                                <button
                                    className="btn-icon"
                                    onClick={() => setSelectedTicket(null)}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        background: 'var(--primary-bg)',
                                        color: 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '1rem', marginBottom: '6px' }}>{selectedTicket.subject}</h4>
                                <div className="flex gap-2" style={{ display: 'flex', gap: '8px' }}>
                                    {getStatusBadge(selectedTicket.status)}
                                    <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.05)', textTransform: 'capitalize' }}>{selectedTicket.priority}</span>
                                    <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.05)', textTransform: 'capitalize' }}>{selectedTicket.category}</span>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Chat Section */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '16px',
                            background: 'var(--bg-secondary)'
                        }}>
                            {/* Original Message */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>You (Original Request)</div>
                                <div style={{ background: 'white', color: '#000000', padding: '12px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                    <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', color: '#000000' }}>{selectedTicket.message}</p>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '4px' }}>{new Date(selectedTicket.createdAt).toLocaleString()}</div>
                            </div>

                            {/* Responses */}
                            {selectedTicket.responses && selectedTicket.responses.map((resp, idx) => (
                                <div key={idx} style={{
                                    marginBottom: '16px',
                                    textAlign: resp.sender === 'school' ? 'right' : 'left'
                                }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>
                                        {resp.sender === 'school' ? 'You' : 'Support Team'}
                                    </div>
                                    <div style={{
                                        background: resp.sender === 'school' ? 'var(--primary-purple)' : 'white',
                                        color: '#000000',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        display: 'inline-block',
                                        maxWidth: '85%',
                                        textAlign: 'left'
                                    }}>
                                        <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', color: '#000000' }}>{resp.message}</p>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '4px' }}>{new Date(resp.timestamp).toLocaleString()}</div>
                                </div>
                            ))}
                        </div>

                        {/* Fixed Footer Section (Reply) */}
                        <div style={{
                            padding: '16px',
                            borderTop: '1px solid var(--border-color)',
                            background: 'var(--bg-card)',
                            flexShrink: 0
                        }}>
                            <textarea
                                className="form-input"
                                rows="2"
                                placeholder="Type your reply..."
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                disabled={selectedTicket.status === 'resolved'}
                                style={{ marginBottom: '8px', resize: 'none' }}
                            ></textarea>
                            <div className="flex justify-end" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={handleSendReply}
                                    disabled={!replyMessage.trim() || selectedTicket.status === 'resolved'}
                                    style={{ padding: '6px 16px' }}
                                >
                                    Send Reply
                                </button>
                            </div>
                            {selectedTicket.status === 'resolved' && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '4px', textAlign: 'center' }}>
                                    This ticket is resolved.
                                </p>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </Layout>
    );
};

export default SchoolSupport;

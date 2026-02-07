import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter, faCheckCircle, faClock, faSpinner, faEye } from '@fortawesome/free-solid-svg-icons';
import Layout from '../../components/common/Layout';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useToast } from '../../components/common/Toast';

const AdminTickets = () => {
    const toast = useToast();
    const { theme } = useTheme();
    // token not needed
    const { user } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [filteredTickets, setFilteredTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyMessage, setReplyMessage] = useState('');

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

    // API_URL handled by api service

    useEffect(() => {
        fetchTickets();
    }, []);

    useEffect(() => {
        filterTickets();
    }, [tickets, filterStatus, searchTerm]);

    const fetchTickets = async () => {
        try {
            // No headers config needed
            const response = await api.get('/api/tickets');
            setTickets(response.data);
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching tickets:', error);
            setIsLoading(false);
            toast.error('Failed to load tickets');
        }
    };

    const filterTickets = () => {
        let temp = [...tickets];

        if (filterStatus !== 'all') {
            temp = temp.filter(t => t.status === filterStatus);
        }

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            temp = temp.filter(t =>
                t.subject.toLowerCase().includes(lowerSearch) ||
                t.school?.name.toLowerCase().includes(lowerSearch) ||
                t.school?.email.toLowerCase().includes(lowerSearch)
            );
        }

        setFilteredTickets(temp);
    };

    const handleStatusUpdate = async (ticketId, newStatus) => {
        try {
            const response = await api.patch(`/api/tickets/${ticketId}/status`, { status: newStatus });
            const updatedTicket = response.data;

            // Update local state
            setTickets(prev => prev.map(t =>
                t._id === ticketId ? { ...t, status: newStatus } : t
            ));

            if (selectedTicket && selectedTicket._id === ticketId) {
                setSelectedTicket(prev => ({ ...prev, status: newStatus }));
            }

            toast.success(`Ticket marked as ${newStatus}`);
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
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

    const getPriorityBadge = (priority) => {
        const colors = {
            low: 'bg-green-100 text-green-800',
            medium: 'bg-yellow-100 text-yellow-800',
            high: 'bg-red-100 text-red-800'
        };
        // Simple inline styles for now as we use custom CSS
        let style = { padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold' };
        if (priority === 'high') style.background = 'rgba(239, 68, 68, 0.1)';
        else if (priority === 'medium') style.background = 'rgba(245, 158, 11, 0.1)';
        else style.background = 'rgba(16, 185, 129, 0.1)';

        return <span style={{ ...style, color: 'inherit' }}>{priority}</span>;
    };

    return (
        <Layout title="Support Tickets" subtitle="Manage and resolve school inquiries">
            <div className="grid grid-3">
                {/* valid ticket list - full width if no ticket selected, or 2/3 if selected */}
                <div style={{ gridColumn: selectedTicket ? 'span 2' : 'span 3' }}>
                    <div className="card mb-6">
                        <div className="flex justify-between items-center mb-6" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <div className="flex gap-4" style={{ display: 'flex', gap: '16px' }}>
                                <div className="search-box" style={{ position: 'relative' }}>
                                    <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Search tickets..."
                                        style={{ paddingLeft: '36px' }}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <select
                                    className="form-input"
                                    style={{ width: 'auto' }}
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                </select>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <div className="spinner"></div>
                            </div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="text-center p-8 text-muted">No tickets found.</div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Subject</th>
                                            <th>School</th>
                                            <th>Priority</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTickets.map((ticket) => (
                                            <tr
                                                key={ticket._id}
                                                onClick={() => handleTicketSelect(ticket)}
                                                style={{
                                                    cursor: 'pointer',
                                                    background: selectedTicket?._id === ticket._id ? 'var(--primary-bg)' : 'transparent'
                                                }}
                                            >
                                                <td style={{ fontWeight: 500 }}>{ticket.subject}</td>
                                                <td>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{ticket.school?.name || 'Unknown'}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{ticket.school?.email}</div>
                                                </td>
                                                <td>{getPriorityBadge(ticket.priority)}</td>
                                                <td>{getStatusBadge(ticket.status)}</td>
                                                <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                                                <td>
                                                    <button className="btn-icon" title="View Details">
                                                        <FontAwesomeIcon icon={faEye} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Ticket Details Sidebar */}
                {selectedTicket && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="card"
                        style={{ height: 'fit-content' }}
                    >
                        <div className="flex justify-between items-start mb-4" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 className="card-title">Ticket Details</h3>
                            <button
                                className="btn-icon"
                                onClick={() => setSelectedTicket(null)}
                                style={{ fontSize: '1.2rem' }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Status Actions */}
                        <div className="flex gap-2 mb-6" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                            {selectedTicket.status !== 'pending' && (
                                <button
                                    className="btn btn-sm"
                                    style={{ border: '1px solid var(--warning)', color: 'var(--warning)', background: 'transparent', padding: '4px 8px', fontSize: '0.8rem' }}
                                    onClick={() => handleStatusUpdate(selectedTicket._id, 'pending')}
                                >
                                    Mark Pending
                                </button>
                            )}
                            {selectedTicket.status !== 'in-progress' && (
                                <button
                                    className="btn btn-sm"
                                    style={{ border: '1px solid var(--info)', color: 'var(--info)', background: 'transparent', padding: '4px 8px', fontSize: '0.8rem' }}
                                    onClick={() => handleStatusUpdate(selectedTicket._id, 'in-progress')}
                                >
                                    Mark In Progress
                                </button>
                            )}
                            {selectedTicket.status !== 'resolved' && (
                                <button
                                    className="btn btn-sm"
                                    style={{ background: 'var(--success)', color: 'white', padding: '4px 8px', fontSize: '0.8rem' }}
                                    onClick={() => handleStatusUpdate(selectedTicket._id, 'resolved')}
                                >
                                    Mark Resolved
                                </button>
                            )}
                        </div>

                        <div className="mb-6">
                            <h4 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>{selectedTicket.subject}</h4>
                            <div className="flex gap-2 mb-4" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                {getStatusBadge(selectedTicket.status)}
                                {getPriorityBadge(selectedTicket.priority)}
                                <span className="badge" style={{ textTransform: 'capitalize' }}>{selectedTicket.category}</span>
                            </div>

                            <div className="flex flex-col gap-2 mb-4" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>
                                    <strong>Submitted by:</strong> {selectedTicket.school?.name}
                                </div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>
                                    <strong>Date:</strong> {new Date(selectedTicket.createdAt).toLocaleString()}
                                </div>
                            </div>

                            {/* Conversation Thread */}
                            <div style={{
                                background: 'var(--bg-secondary)',
                                padding: '16px',
                                borderRadius: '8px',
                                marginBottom: '24px',
                                maxHeight: '400px',
                                overflowY: 'auto'
                            }}>
                                {/* Original Message */}
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>{selectedTicket.school?.name} (Original Request)</div>
                                    <div style={{ background: 'white', padding: '12px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{selectedTicket.message}</p>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '4px' }}>{new Date(selectedTicket.createdAt).toLocaleString()}</div>
                                </div>

                                {/* Responses */}
                                {selectedTicket.responses && selectedTicket.responses.map((resp, idx) => (
                                    <div key={idx} style={{
                                        marginBottom: '20px',
                                        textAlign: resp.sender === 'admin' ? 'right' : 'left'
                                    }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>
                                            {resp.sender === 'admin' ? 'Support Team' : selectedTicket.school?.name}
                                        </div>
                                        <div style={{
                                            background: resp.sender === 'admin' ? 'var(--primary-purple)' : 'white',
                                            color: resp.sender === 'admin' ? 'white' : 'inherit',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            display: 'inline-block',
                                            maxWidth: '85%',
                                            textAlign: 'left'
                                        }}>
                                            <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{resp.message}</p>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '4px' }}>{new Date(resp.timestamp).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Reply Box */}
                            <div className="mt-4">
                                <label className="form-label">Reply</label>
                                <textarea
                                    className="form-input"
                                    rows="3"
                                    placeholder="Type your reply..."
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                ></textarea>
                                <div className="flex justify-end mt-2" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={handleSendReply}
                                        disabled={!replyMessage.trim()}
                                    >
                                        Send Reply
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Status Actions removed from bottom, moved to top */}
                    </motion.div>
                )}
            </div>
        </Layout>
    );
};

export default AdminTickets;

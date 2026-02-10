import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter, faCheckCircle, faClock, faSpinner, faArrowRight, faTimes, faPlay } from '@fortawesome/free-solid-svg-icons';
import Layout from '../../components/common/Layout';
import Background3D from '../../components/common/Background3D';
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
            <Background3D />
            <div className="grid grid-3" style={{ position: 'relative', zIndex: 1 }}>
                {/* valid ticket list - always full width */}
                <div style={{ gridColumn: 'span 3' }}>
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
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        {ticket.status === 'open' && (
                                                            <button
                                                                className="btn-icon"
                                                                title="Mark In Progress"
                                                                onClick={() => handleStatusUpdate(ticket._id, 'in_progress')}
                                                                style={{
                                                                    width: '32px',
                                                                    height: '32px',
                                                                    borderRadius: '8px',
                                                                    background: 'var(--warning)',
                                                                    color: 'white',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <FontAwesomeIcon icon={faPlay} />
                                                            </button>
                                                        )}

                                                        {ticket.status !== 'resolved' && (
                                                            <button
                                                                className="btn-icon"
                                                                title="Mark Resolved"
                                                                onClick={() => handleStatusUpdate(ticket._id, 'resolved')}
                                                                style={{
                                                                    width: '32px',
                                                                    height: '32px',
                                                                    borderRadius: '8px',
                                                                    background: 'var(--success)',
                                                                    color: 'white',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <FontAwesomeIcon icon={faCheckCircle} />
                                                            </button>
                                                        )}

                                                        <button className="btn-icon" title="View Details" onClick={() => setSelectedTicket(ticket)} style={{
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
                                                            <FontAwesomeIcon icon={faArrowRight} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
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
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="card"
                        style={{
                            width: '100%',
                            maxWidth: '800px',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            position: 'relative',
                            margin: '0 auto',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            padding: 0
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Fixed Header */}
                        <div style={{
                            padding: '16px',
                            borderBottom: '1px solid var(--border-color)',
                            background: 'inherit',
                            flexShrink: 0
                        }}>
                            <div className="flex justify-between items-start mb-2" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
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

                            {/* Status Actions */}
                            <div className="flex gap-2 mb-3" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {selectedTicket.status !== 'pending' && (
                                    <button
                                        className="btn btn-sm"
                                        style={{ border: '1px solid var(--warning)', color: 'var(--warning)', background: 'transparent', padding: '2px 8px', fontSize: '0.75rem' }}
                                        onClick={() => handleStatusUpdate(selectedTicket._id, 'pending')}
                                    >
                                        Mark Pending
                                    </button>
                                )}
                                {selectedTicket.status !== 'in-progress' && (
                                    <button
                                        className="btn btn-sm"
                                        style={{ border: '1px solid var(--info)', color: 'var(--info)', background: 'transparent', padding: '2px 8px', fontSize: '0.75rem' }}
                                        onClick={() => handleStatusUpdate(selectedTicket._id, 'in-progress')}
                                    >
                                        Mark In Progress
                                    </button>
                                )}
                                {selectedTicket.status !== 'resolved' && (
                                    <button
                                        className="btn btn-sm"
                                        style={{ background: 'var(--success)', color: 'white', padding: '2px 8px', fontSize: '0.75rem' }}
                                        onClick={() => handleStatusUpdate(selectedTicket._id, 'resolved')}
                                    >
                                        Mark Resolved
                                    </button>
                                )}
                            </div>

                            <div>
                                <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>{selectedTicket.subject}</h4>
                                <div className="flex gap-2 mb-2" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {getStatusBadge(selectedTicket.status)}
                                    {getPriorityBadge(selectedTicket.priority)}
                                    <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.05)', textTransform: 'capitalize' }}>{selectedTicket.category}</span>
                                </div>

                                <div className="flex gap-4" style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                                    <div><strong>By:</strong> {selectedTicket.school?.name}</div>
                                    <div><strong>Date:</strong> {new Date(selectedTicket.createdAt).toLocaleDateString()}</div>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Chat Area */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '16px',
                            background: 'var(--bg-secondary)'
                        }}>
                            {/* Original Message */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>{selectedTicket.school?.name} (Original Request)</div>
                                <div style={{ background: 'white', color: '#000000', padding: '12px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                    <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', color: '#000000' }}>{selectedTicket.message}</p>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '4px' }}>{new Date(selectedTicket.createdAt).toLocaleString()}</div>
                            </div>

                            {/* Responses */}
                            {selectedTicket.responses && selectedTicket.responses.map((resp, idx) => (
                                <div key={idx} style={{
                                    marginBottom: '16px',
                                    textAlign: resp.sender === 'admin' ? 'right' : 'left'
                                }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>
                                        {resp.sender === 'admin' ? 'Support Team' : selectedTicket.school?.name}
                                    </div>
                                    <div style={{
                                        background: resp.sender === 'admin' ? 'var(--primary-purple)' : 'white',
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

                        {/* Fixed Footer (Reply) */}
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
                                style={{ marginBottom: '8px', resize: 'none' }}
                            ></textarea>
                            <div className="flex justify-end" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={handleSendReply}
                                    disabled={!replyMessage.trim()}
                                    style={{ padding: '6px 16px' }}
                                >
                                    Send Reply
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </Layout>
    );
};

export default AdminTickets;

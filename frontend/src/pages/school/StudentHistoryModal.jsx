import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faChartLine } from '@fortawesome/free-solid-svg-icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../services/api';

const StudentHistoryModal = ({ isOpen, onClose, student, assessmentId, assessmentTitle }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && student && assessmentId) {
            fetchHistory();
        }
    }, [isOpen, student, assessmentId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/api/school/analytics/student/${student._id}/attempts/${assessmentId}`);
            // Format dates
            const data = response.data.map((attempt, index) => ({
                ...attempt,
                attempt: index + 1,
                date: new Date(attempt.submittedAt).toLocaleDateString(),
                fullDate: new Date(attempt.submittedAt).toLocaleString()
            }));
            setHistory(data);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="modal-overlay" onClick={onClose}>
                <motion.div
                    className="modal"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ maxWidth: '800px', width: '90%' }}
                >
                    <div className="modal-header">
                        <div>
                            <h2 className="modal-title">Performance History</h2>
                            <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                                {student?.name} - {assessmentTitle}
                            </p>
                        </div>
                        <button className="modal-close" onClick={onClose}>
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>

                    <div className="modal-body">
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <div className="spinner"></div>
                            </div>
                        ) : history.length > 0 ? (
                            <>
                                <div className="chart-container" style={{ height: '300px', marginBottom: '2rem' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={history} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                            <XAxis
                                                dataKey="attempt"
                                                label={{ value: 'Attempt', position: 'insideBottomRight', offset: -5 }}
                                            />
                                            <YAxis
                                                domain={[0, 'auto']}
                                                label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                labelFormatter={(value) => `Attempt ${value}`}
                                            />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="totalScore"
                                                name="Total Score"
                                                stroke="#8B5CF6"
                                                strokeWidth={3}
                                                activeDot={{ r: 8 }}
                                                animationDuration={1500}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Attempt</th>
                                                <th>Date</th>
                                                <th>Score</th>
                                                <th>Bucket</th>
                                                <th>Time Taken</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {history.map((attempt) => (
                                                <tr key={attempt._id}>
                                                    <td className="font-medium">#{attempt.attempt}</td>
                                                    <td>{attempt.fullDate}</td>
                                                    <td className="font-bold text-primary">{attempt.totalScore}</td>
                                                    <td>
                                                        <span className="badge badge-purple">{attempt.assignedBucket}</span>
                                                    </td>
                                                    <td>{Math.round(attempt.timeTaken / 60)} mins</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="empty-state p-8">
                                <p>No history found for this assessment.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default StudentHistoryModal;

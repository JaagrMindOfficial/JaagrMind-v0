import React, { useState } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
    BarChart, Bar
} from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBrain, faHeart, faComments, faMobileScreen,
    faChartLine, faCalendar
} from '@fortawesome/free-solid-svg-icons';
import { motion } from 'framer-motion';

// Bucket colors matching theme
const BUCKET_COLORS = {
    'Skill Stable': '#10B981',
    'Skill Emerging': '#F59E0B',
    'Skill Support Needed': '#EF4444',
    'Thriving': '#10B981',
    'Growing': '#8B5CF6',
    'Emerging': '#F59E0B',
    'Needs Support': '#EF4444'
};

const SKILL_AREAS = [
    { key: 'A', name: 'Focus & Attention', icon: faBrain, color: '#8B5CF6' },
    { key: 'B', name: 'Self-Esteem & Confidence', icon: faHeart, color: '#EC4899' },
    { key: 'C', name: 'Social Interaction', icon: faComments, color: '#06B6D4' },
    { key: 'D', name: 'Digital Hygiene', icon: faMobileScreen, color: '#10B981' }
];

const AnalyticsCharts = ({ data, title, variant = 'school' }) => {
    // variant: 'school' | 'class' | 'student'
    const [trendType, setTrendType] = useState('monthly');

    if (!data) return null;

    return (
        <div className="analytics-charts-container">
            {/* 1. Skill Distribution (Pie Charts) */}
            <motion.div
                className="card mb-6 p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h3 className="card-title mb-6">
                    {variant === 'student' ? 'Skill Profile' : 'Batch Profile: Skill Distribution'}
                </h3>
                <div className="grid grid-4 gap-4 mobile-grid-2">
                    {SKILL_AREAS.map(skill => {
                        let pieData = [];

                        // Handle different data structures
                        if (variant === 'student') {
                            // For single student, maybe show their average score or something else?
                            // OR show the distribution of their OWN buckets across all submissions
                            if (data.distributions?.[skill.key]) {
                                const dist = data.distributions[skill.key];
                                pieData = Object.entries(dist).map(([key, val]) => ({
                                    name: key.replace('Skill ', ''),
                                    value: val,
                                    color: BUCKET_COLORS[key] || '#6B7280'
                                })).filter(d => d.value > 0);
                            }
                        } else {
                            // School/Class view
                            const dist = data.sectionDistributions?.[skill.key];
                            pieData = dist ? Object.entries(dist).map(([key, val]) => ({
                                name: key.replace('Skill ', ''),
                                value: val,
                                color: BUCKET_COLORS[key] || '#6B7280'
                            })).filter(d => d.value > 0) : [];
                        }

                        return (
                            <div key={skill.key} className="text-center">
                                <div className="mb-2 font-medium flex items-center justify-center gap-2">
                                    <FontAwesomeIcon icon={skill.icon} style={{ color: skill.color }} />
                                    {skill.name.split(' ')[0]}
                                </div>
                                <div style={{ height: '200px' }}>
                                    {pieData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={40}
                                                    outerRadius={60}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted text-sm">No data</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </motion.div>

            {/* 2. Trends Chart (New) */}
            <motion.div
                className="card mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="card-title">
                        <FontAwesomeIcon icon={faChartLine} style={{ marginRight: '8px', color: 'var(--primary-purple)' }} />
                        Performance Trends
                    </h3>
                    <div className="flex gap-2">
                        <button
                            className={`btn btn-sm ${trendType === 'monthly' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setTrendType('monthly')}
                        >
                            Monthly
                        </button>
                        <button
                            className={`btn btn-sm ${trendType === 'weekly' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setTrendType('weekly')}
                        >
                            Weekly
                        </button>
                    </div>
                </div>

                <div style={{ height: '300px' }}>
                    {data.trends && data.trends[trendType] && data.trends[trendType].length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.trends[trendType]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" />
                                <YAxis domain={[0, 32]} reversed={true} label={{ value: 'Avg Index (Lower is Better)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="avgScore"
                                    name="Average Index"
                                    stroke="#8B5CF6"
                                    strokeWidth={3}
                                    dot={{ r: 4, strokeWidth: 2 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted">Thinking needed... Data not available</div>
                    )}
                </div>
            </motion.div>

            {/* 3. Development Patterns (Only for School Aggregated View) */}
            {variant === 'school' && (
                <motion.div
                    className="card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <h3 className="card-title mb-4">Developmental Patterns (Avg Index by Grade)</h3>
                    <p className="text-muted mb-4 text-sm">Lower index = stronger skills. Look for upward trends (declining skills) in higher grades.</p>
                    {data.averagesByGrade && data.averagesByGrade.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={data.averagesByGrade}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="grade" label={{ value: 'Grade', position: 'insideBottom', offset: -5 }} />
                                <YAxis domain={[0, 32]} reversed={true} label={{ value: 'Avg Index (Lower is Better)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend />
                                {SKILL_AREAS.map(skill => (
                                    <Line
                                        key={skill.key}
                                        type="monotone"
                                        dataKey={skill.key}
                                        name={skill.name.split(' ')[0]}
                                        stroke={skill.color}
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-state">No grade-wise data available</div>
                    )}
                </motion.div>
            )}
        </div>
    );
};

export default AnalyticsCharts;

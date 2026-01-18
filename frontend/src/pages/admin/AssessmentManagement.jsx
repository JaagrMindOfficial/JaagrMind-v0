import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/common/Layout';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';
import './AssessmentManagement.css';

const defaultBuckets = [
    { label: 'Skill Stable', minScore: 8, maxScore: 14 },
    { label: 'Skill Emerging', minScore: 15, maxScore: 22 },
    { label: 'Skill Support Needed', minScore: 23, maxScore: 32 }
];

const defaultSections = [
    { key: 'A', name: 'Focus & Attention' },
    { key: 'B', name: 'Self-Esteem & Inner Confidence' },
    { key: 'C', name: 'Social Confidence & Interaction' },
    { key: 'D', name: 'Digital Hygiene & Self-Control' }
];

const AssessmentManagement = () => {
    const toast = useToast();
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showQuestionsModal, setShowQuestionsModal] = useState(false);
    const [showSectionsModal, setShowSectionsModal] = useState(false);
    const [editingAssessment, setEditingAssessment] = useState(null);
    const [viewingAssessment, setViewingAssessment] = useState(null);
    const [saving, setSaving] = useState(false);
    const [settingDefault, setSettingDefault] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        inactivityAlertTime: 40,
        inactivityEndTime: 120,
        questions: [],
        buckets: defaultBuckets,
        customSections: defaultSections
    });

    const [currentQuestion, setCurrentQuestion] = useState({
        section: 'A',
        text: '',
        options: [
            { label: '', marks: 1 },
            { label: '', marks: 2 },
            { label: '', marks: 3 },
            { label: '', marks: 4 }
        ]
    });

    const [newSection, setNewSection] = useState({ key: '', name: '' });

    useEffect(() => {
        fetchAssessments();
    }, []);

    const fetchAssessments = async () => {
        try {
            const response = await api.get('/api/admin/assessments');
            setAssessments(response.data);
        } catch (error) {
            console.error('Error fetching assessments:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingAssessment(null);
        setFormData({
            title: '',
            description: '',
            inactivityAlertTime: 40,
            inactivityEndTime: 120,
            questions: [],
            buckets: defaultBuckets,
            customSections: defaultSections
        });
        setShowModal(true);
    };

    const openEditModal = (assessment) => {
        setEditingAssessment(assessment);
        setFormData({
            title: assessment.title,
            description: assessment.description || '',
            inactivityAlertTime: assessment.inactivityAlertTime || 40,
            inactivityEndTime: assessment.inactivityEndTime || 120,
            questions: assessment.questions || [],
            buckets: assessment.buckets || defaultBuckets,
            customSections: assessment.customSections?.length > 0
                ? assessment.customSections
                : defaultSections
        });
        setShowModal(true);
    };

    const openQuestionsModal = (assessment) => {
        setViewingAssessment(assessment);
        setShowQuestionsModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingAssessment(null);
    };

    const getSectionName = (sectionKey) => {
        const section = formData.customSections.find(s => s.key === sectionKey);
        return section ? section.name : sectionKey;
    };

    const addQuestion = () => {
        if (!currentQuestion.text.trim()) {
            toast.warning('Please enter question text');
            return;
        }
        if (currentQuestion.options.some(o => !o.label.trim())) {
            toast.warning('Please fill all 4 options');
            return;
        }

        setFormData({
            ...formData,
            questions: [...formData.questions, { ...currentQuestion }]
        });

        // Reset current question form
        setCurrentQuestion({
            section: currentQuestion.section, // Keep same section for convenience
            text: '',
            options: [
                { label: '', marks: 1 },
                { label: '', marks: 2 },
                { label: '', marks: 3 },
                { label: '', marks: 4 }
            ]
        });
    };

    const removeQuestion = (index) => {
        setFormData({
            ...formData,
            questions: formData.questions.filter((_, i) => i !== index)
        });
    };

    const addSection = () => {
        if (!newSection.key.trim() || !newSection.name.trim()) {
            toast.warning('Please enter both section key and name');
            return;
        }
        if (formData.customSections.some(s => s.key === newSection.key)) {
            toast.warning('Section key already exists');
            return;
        }
        setFormData({
            ...formData,
            customSections: [...formData.customSections, { ...newSection }]
        });
        setNewSection({ key: '', name: '' });
    };

    const removeSection = (key) => {
        // Check if any questions use this section
        const hasQuestions = formData.questions.some(q => q.section === key);
        if (hasQuestions) {
            toast.warning('Cannot remove section with existing questions. Remove or reassign questions first.');
            return;
        }
        setFormData({
            ...formData,
            customSections: formData.customSections.filter(s => s.key !== key)
        });
    };

    const handleSave = async () => {
        if (!formData.title.trim()) {
            toast.warning('Please enter assessment title');
            return;
        }
        if (formData.questions.length === 0 && !editingAssessment) {
            toast.warning('Please add at least one question');
            return;
        }
        if (formData.customSections.length === 0) {
            toast.warning('Please add at least one section');
            return;
        }

        setSaving(true);
        try {
            if (editingAssessment) {
                await api.put(`/api/admin/assessments/${editingAssessment._id}`, formData);
            } else {
                await api.post('/api/admin/assessments', formData);
            }
            closeModal();
            fetchAssessments();
        } catch (error) {
            console.error('Save error:', error);
            toast.error(error.response?.data?.message || 'Error saving assessment');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (assessment) => {
        if (assessment.isDefault) {
            toast.warning('Cannot delete the default assessment');
            return;
        }

        if (!window.confirm(`Are you sure you want to delete "${assessment.title}"?`)) {
            return;
        }

        try {
            await api.delete(`/api/admin/assessments/${assessment._id}`);
            fetchAssessments();
        } catch (error) {
            console.error('Delete error:', error);
            toast.error(error.response?.data?.message || 'Error deleting assessment');
        }
    };

    const handleSetDefault = async (assessment) => {
        if (assessment.isDefault) return;

        setSettingDefault(assessment._id);
        try {
            await api.put(`/api/admin/assessments/${assessment._id}/set-default`);
            fetchAssessments();
        } catch (error) {
            console.error('Set default error:', error);
            toast.error(error.response?.data?.message || 'Error setting default');
        } finally {
            setSettingDefault(null);
        }
    };

    if (loading) {
        return (
            <Layout title="Assessment Management">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p className="loading-text">Loading assessments...</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Assessment Management" subtitle="Manage wellness assessments">
            <div className="page-header">
                <div>
                    <span className="text-muted">{assessments.length} assessment(s)</span>
                </div>
                <motion.button
                    className="btn btn-primary"
                    onClick={openCreateModal}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    + Create Assessment
                </motion.button>
            </div>

            <div className="assessments-grid">
                {assessments.map((assessment, index) => (
                    <motion.div
                        key={assessment._id}
                        className={`assessment-card ${assessment.isDefault ? 'default' : ''}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        {assessment.isDefault && (
                            <div className="default-badge">DEFAULT</div>
                        )}

                        <div className="assessment-icon">📝</div>

                        <h3 className="assessment-title">{assessment.title}</h3>
                        <p className="assessment-desc">
                            {assessment.description || 'Wellness assessment for students'}
                        </p>

                        <div className="assessment-stats">
                            <div className="assessment-stat">
                                <span className="assessment-stat-value">{assessment.questionCount || assessment.questions?.length || 0}</span>
                                <span className="assessment-stat-label">Questions</span>
                            </div>
                            <div className="assessment-stat">
                                <span className="assessment-stat-value">{assessment.inactivityAlertTime || 40}s</span>
                                <span className="assessment-stat-label">Alert Time</span>
                            </div>
                            <div className="assessment-stat">
                                <span className="assessment-stat-value">{assessment.customSections?.length || 4}</span>
                                <span className="assessment-stat-label">Sections</span>
                            </div>
                        </div>

                        <div className="assessment-sections">
                            {(assessment.customSections?.length > 0 ? assessment.customSections : defaultSections).slice(0, 4).map((section, i) => (
                                <div
                                    key={section.key}
                                    className="section-tag"
                                    style={{ background: `rgba(185, 147, 233, ${0.1 + i * 0.1})` }}
                                >
                                    {section.key}: {section.name.split(' ')[0]}
                                </div>
                            ))}
                        </div>

                        <div className="assessment-buckets">
                            <h4>Score Interpretation</h4>
                            <div className="bucket-list">
                                <div className="bucket-item">
                                    <span className="bucket-dot" style={{ background: '#10B981' }}></span>
                                    <span>8-14: Skill Stable</span>
                                </div>
                                <div className="bucket-item">
                                    <span className="bucket-dot" style={{ background: '#F59E0B' }}></span>
                                    <span>15-22: Skill Emerging</span>
                                </div>
                                <div className="bucket-item">
                                    <span className="bucket-dot" style={{ background: '#EF4444' }}></span>
                                    <span>23-32: Support Needed</span>
                                </div>
                            </div>
                        </div>

                        <div className="assessment-footer">
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => openQuestionsModal(assessment)}
                            >
                                View Questions
                            </button>
                            <button
                                className="btn btn-outline btn-sm"
                                onClick={() => openEditModal(assessment)}
                            >
                                ✏️ Edit
                            </button>
                            {!assessment.isDefault && (
                                <>
                                    <button
                                        className="btn btn-success btn-sm"
                                        onClick={() => handleSetDefault(assessment)}
                                        disabled={settingDefault === assessment._id}
                                    >
                                        {settingDefault === assessment._id ? '...' : '⭐ Set Default'}
                                    </button>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleDelete(assessment)}
                                    >
                                        🗑️ Delete
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                ))}

                {assessments.length === 0 && (
                    <div className="empty-state card">
                        <div className="empty-state-icon">📝</div>
                        <h3 className="empty-state-title">No Assessments</h3>
                        <p className="empty-state-text">Create your first assessment</p>
                        <button className="btn btn-primary" onClick={openCreateModal}>
                            Create Assessment
                        </button>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeModal}
                    >
                        <motion.div
                            className="modal modal-large"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2 className="modal-title">
                                    {editingAssessment ? 'Edit Assessment' : 'Create New Assessment'}
                                </h2>
                                <button className="modal-close" onClick={closeModal}>×</button>
                            </div>

                            <div className="modal-body modal-body-scroll">
                                <div className="form-group">
                                    <label className="form-label">Assessment Title *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g., Student Wellness Assessment"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="form-input"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Brief description of the assessment"
                                        rows="2"
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Inactivity Alert Time (seconds)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.inactivityAlertTime}
                                            onChange={(e) => setFormData({ ...formData, inactivityAlertTime: parseInt(e.target.value) || 40 })}
                                        />
                                        <small className="form-hint">Show alert after this many seconds of no answer</small>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Inactivity End Time (seconds)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.inactivityEndTime}
                                            onChange={(e) => setFormData({ ...formData, inactivityEndTime: parseInt(e.target.value) || 120 })}
                                        />
                                        <small className="form-hint">End test after this many total seconds of inactivity</small>
                                    </div>
                                </div>

                                {/* Sections Management */}
                                <div className="sections-section">
                                    <div className="section-header">
                                        <h3>Sections ({formData.customSections.length})</h3>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setShowSectionsModal(true)}
                                        >
                                            ⚙️ Manage Sections
                                        </button>
                                    </div>
                                    <div className="sections-list">
                                        {formData.customSections.map(s => (
                                            <span key={s.key} className="section-pill">
                                                {s.key}: {s.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Questions Section */}
                                <div className="questions-section">
                                    <h3>Questions ({formData.questions.length})</h3>

                                    {formData.questions.length > 0 && (
                                        <div className="questions-list">
                                            {formData.questions.map((q, idx) => (
                                                <div key={idx} className="question-item">
                                                    <span className="question-section-badge">{q.section}</span>
                                                    <span className="question-preview">{q.text}</span>
                                                    <button
                                                        className="question-remove"
                                                        onClick={() => removeQuestion(idx)}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add Question Form */}
                                    <div className="add-question-form">
                                        <h4>Add New Question</h4>
                                        <div className="form-group">
                                            <label className="form-label">Section</label>
                                            <select
                                                className="form-input"
                                                value={currentQuestion.section}
                                                onChange={(e) => setCurrentQuestion({ ...currentQuestion, section: e.target.value })}
                                            >
                                                {formData.customSections.map(section => (
                                                    <option key={section.key} value={section.key}>
                                                        {section.key}: {section.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Question Text</label>
                                            <textarea
                                                className="form-input"
                                                value={currentQuestion.text}
                                                onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
                                                placeholder="Enter your question here..."
                                                rows="2"
                                            />
                                        </div>

                                        <div className="options-form">
                                            <label className="form-label">Options (1=low score, 4=high score)</label>
                                            {currentQuestion.options.map((opt, idx) => (
                                                <div key={idx} className="option-row">
                                                    <span className="option-mark">{idx + 1}</span>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        value={opt.label}
                                                        onChange={(e) => {
                                                            const newOptions = [...currentQuestion.options];
                                                            newOptions[idx] = { ...newOptions[idx], label: e.target.value };
                                                            setCurrentQuestion({ ...currentQuestion, options: newOptions });
                                                        }}
                                                        placeholder={`Option ${idx + 1}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={addQuestion}
                                        >
                                            + Add Question
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : (editingAssessment ? 'Update Assessment' : 'Create Assessment')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sections Management Modal */}
            <AnimatePresence>
                {showSectionsModal && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowSectionsModal(false)}
                    >
                        <motion.div
                            className="modal"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2 className="modal-title">Manage Sections</h2>
                                <button className="modal-close" onClick={() => setShowSectionsModal(false)}>×</button>
                            </div>

                            <div className="modal-body">
                                <p className="text-muted" style={{ marginBottom: '1rem' }}>
                                    Add or remove sections for this assessment. Default sections are A-D.
                                </p>

                                <div className="sections-manager">
                                    {formData.customSections.map(section => (
                                        <div key={section.key} className="section-manager-item">
                                            <div className="section-info">
                                                <span className="section-key">{section.key}</span>
                                                <span className="section-name">{section.name}</span>
                                            </div>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => removeSection(section.key)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="add-section-form">
                                    <h4>Add New Section</h4>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Key (e.g., E)</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={newSection.key}
                                                onChange={(e) => setNewSection({ ...newSection, key: e.target.value.toUpperCase() })}
                                                placeholder="E"
                                                maxLength="2"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Name</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={newSection.name}
                                                onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                                                placeholder="Time Management"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={addSection}
                                    >
                                        + Add Section
                                    </button>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button className="btn btn-primary" onClick={() => setShowSectionsModal(false)}>
                                    Done
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* View Questions Modal */}
            <AnimatePresence>
                {showQuestionsModal && viewingAssessment && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowQuestionsModal(false)}
                    >
                        <motion.div
                            className="modal modal-large"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2 className="modal-title">{viewingAssessment.title} - Questions</h2>
                                <button className="modal-close" onClick={() => setShowQuestionsModal(false)}>×</button>
                            </div>

                            <div className="modal-body modal-body-scroll">
                                {viewingAssessment.questions?.map((q, idx) => {
                                    const sectionDef = (viewingAssessment.customSections || defaultSections).find(s => s.key === q.section);
                                    return (
                                        <div key={idx} className="view-question-item">
                                            <div className="view-question-header">
                                                <span className="question-number">Q{idx + 1}</span>
                                                <span className="question-section-badge">
                                                    {q.section}: {sectionDef?.name || q.section}
                                                </span>
                                            </div>
                                            <p className="view-question-text">{q.text}</p>
                                            <div className="view-options">
                                                {q.options?.map((opt, oi) => (
                                                    <div key={oi} className="view-option">
                                                        <span className="view-option-mark">{opt.marks}</span>
                                                        <span>{opt.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="modal-footer">
                                <button className="btn btn-primary" onClick={() => setShowQuestionsModal(false)}>
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Layout>
    );
};

export default AssessmentManagement;

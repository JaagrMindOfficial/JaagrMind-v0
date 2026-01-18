import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileExport, faFileImport, faUserPlus, faPenToSquare, faSearch } from '@fortawesome/free-solid-svg-icons';
import Layout from '../../components/common/Layout';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';
import './StudentManagement.css';

const StudentManagement = () => {
    const toast = useToast();
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [filters, setFilters] = useState({ class: '', section: '', status: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({ name: '', rollNo: '', class: '', section: '' });
    const [editingStudent, setEditingStudent] = useState(null);
    const fileInputRef = useRef(null);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        fetchStudents();
        fetchClasses();
    }, []);

    const fetchStudents = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.class) params.append('class', filters.class);
            if (filters.section) params.append('section', filters.section);
            if (filters.status) params.append('status', filters.status);

            const response = await api.get(`/api/school/students?${params}`);
            // Handle both paginated { data, pagination } and legacy array responses
            setStudents(response.data.data || response.data);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClasses = async () => {
        try {
            const response = await api.get('/api/school/classes');
            setClasses(response.data.uniqueClasses || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
        }
    };

    const handleStudentSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingStudent) {
                await api.put(`/api/school/students/${editingStudent._id}`, formData);
            } else {
                await api.post('/api/school/students', formData);
            }
            setShowModal(false);
            setFormData({ name: '', rollNo: '', class: '', section: '' });
            setEditingStudent(null);
            fetchStudents();
            fetchClasses();
        } catch (error) {
            toast.error(error.response?.data?.message || `Error ${editingStudent ? 'updating' : 'adding'} student`);
        }
    };

    const handleEdit = (student) => {
        setEditingStudent(student);
        setFormData({
            name: student.name,
            rollNo: student.rollNo || '',
            class: student.class,
            section: student.section || ''
        });
        setShowModal(true);
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImporting(true);
        const form = new FormData();
        form.append('file', file);

        try {
            const response = await api.post('/api/school/students/import', form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success(response.data.message);

            // Show duplicates as warning
            if (response.data.duplicates && response.data.duplicates.length > 0) {
                const dupNames = response.data.duplicates.slice(0, 5).map(d => d.name).join(', ');
                const more = response.data.duplicates.length > 5 ? ` and ${response.data.duplicates.length - 5} more` : '';
                toast.warning(`Skipped ${response.data.duplicates.length} duplicate(s): ${dupNames}${more}`);
            }

            // Show errors as error
            if (response.data.errors && response.data.errors.length > 0) {
                const errRows = response.data.errors.slice(0, 5).map(e => `Row ${e.row}`).join(', ');
                const more = response.data.errors.length > 5 ? ` and ${response.data.errors.length - 5} more` : '';
                toast.error(`Errors in ${response.data.errors.length} row(s): ${errRows}${more}`);
            }
            setShowImportModal(false);
            fetchStudents();
            fetchClasses();
        } catch (error) {
            const errorData = error.response?.data;
            let message = errorData?.message || 'Error importing students';

            if (errorData?.duplicates && errorData.duplicates.length > 0) {
                const dupNames = errorData.duplicates.slice(0, 5).map(d => d.name).join(', ');
                message += ` - All ${errorData.duplicates.length} student(s) are duplicates: ${dupNames}`;
            }

            toast.error(message);
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this student?')) return;
        try {
            await api.delete(`/api/school/students/${id}`);
            fetchStudents();
        } catch (error) {
            console.error('Error deleting student:', error);
        }
    };

    const handleExportIds = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.class) params.append('class', filters.class);
            if (filters.section) params.append('section', filters.section);

            const response = await api.get(`/api/school/export-ids?${params}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'student-access-ids.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            toast.error('Error exporting access IDs');
        }
    };

    const applyFilters = () => {
        setLoading(true);
        fetchStudents();
    };

    return (
        <Layout title="Student Management" subtitle="Add and manage students">
            {/* Actions Bar */}
            <div className="actions-bar">
                <div className="filter-bar">
                    <div className="search-bar">
                        <FontAwesomeIcon icon={faSearch} className="search-icon" />
                        <input
                            type="text"
                            className="form-input search-input"
                            placeholder="Search by name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <select
                        className="form-input"
                        value={filters.class}
                        onChange={(e) => setFilters({ ...filters, class: e.target.value })}
                    >
                        <option value="">All Classes</option>
                        {classes.map(c => (
                            <option key={c} value={c}>Class {c}</option>
                        ))}
                    </select>

                    <select
                        className="form-input"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                    </select>

                    <button className="btn btn-secondary btn-sm" onClick={applyFilters}>
                        Apply
                    </button>
                </div>

                <div className="action-buttons">
                    <motion.button
                        className="btn btn-outline"
                        onClick={handleExportIds}
                        whileHover={{ scale: 1.02 }}
                    >
                        <FontAwesomeIcon icon={faFileExport} /> Export IDs
                    </motion.button>
                    <motion.button
                        className="btn btn-secondary"
                        onClick={() => setShowImportModal(true)}
                        whileHover={{ scale: 1.02 }}
                    >
                        <FontAwesomeIcon icon={faFileImport} /> Import Excel
                    </motion.button>
                    <motion.button
                        className="btn btn-primary"
                        onClick={() => setShowModal(true)}
                        whileHover={{ scale: 1.02 }}
                    >
                        <FontAwesomeIcon icon={faUserPlus} /> Add Student
                    </motion.button>
                </div>
            </div>

            {/* Students Table */}
            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                </div>
            ) : (
                <motion.div
                    className="card"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    {(() => {
                        const filteredStudents = students.filter(student =>
                            student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            student.accessId.toLowerCase().includes(searchQuery.toLowerCase())
                        );

                        if (filteredStudents.length > 0) {
                            return (
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Access ID</th>
                                                <th>Class</th>
                                                <th>Section</th>
                                                <th>Roll No</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredStudents.map((student) => {
                                                const hasCompleted = student.testStatus?.some(t => t.isCompleted);
                                                return (
                                                    <tr key={student._id}>
                                                        <td className="font-medium">{student.name}</td>
                                                        <td>
                                                            <code className="access-id-code">{student.accessId}</code>
                                                        </td>
                                                        <td>{student.class}</td>
                                                        <td>{student.section || '-'}</td>
                                                        <td>{student.rollNo || '-'}</td>
                                                        <td>
                                                            <span className={`badge ${hasCompleted ? 'badge-success' : 'badge-warning'}`}>
                                                                {hasCompleted ? 'Completed' : 'Pending'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="table-actions">
                                                                <button
                                                                    className="icon-btn primary"
                                                                    onClick={() => handleEdit(student)}
                                                                    title="Edit"
                                                                >
                                                                    <FontAwesomeIcon icon={faPenToSquare} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        } else if (students.length > 0 && filteredStudents.length === 0) {
                            return (
                                <div className="empty-state">
                                    <div className="empty-state-icon"><FontAwesomeIcon icon={faSearch} /></div>
                                    <h3 className="empty-state-title">No Results Found</h3>
                                    <p className="empty-state-text">No students match "{searchQuery}"</p>
                                    <button className="btn btn-secondary" onClick={() => setSearchQuery('')}>
                                        Clear Search
                                    </button>
                                </div>
                            );
                        } else {
                            return (
                                <div className="empty-state">
                                    <div className="empty-state-icon">👨‍🎓</div>
                                    <h3 className="empty-state-title">No Students Yet</h3>
                                    <p className="empty-state-text">Add students manually or import from Excel</p>
                                    <div className="flex gap-3 justify-center mt-4">
                                        <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
                                            Import Excel
                                        </button>
                                        <button className="btn btn-primary" onClick={() => { setEditingStudent(null); setFormData({ name: '', rollNo: '', class: '', section: '' }); setShowModal(true); }}>
                                            Add Student
                                        </button>
                                    </div>
                                </div>
                            );
                        }
                    })()}
                </motion.div>
            )}

            {/* Add Student Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => { setShowModal(false); setEditingStudent(null); setFormData({ name: '', rollNo: '', class: '', section: '' }); }}
                    >
                        <motion.div
                            className="modal"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2 className="modal-title">{editingStudent ? 'Edit Student' : 'Add New Student'}</h2>
                                <button className="modal-close" onClick={() => { setShowModal(false); setEditingStudent(null); setFormData({ name: '', rollNo: '', class: '', section: '' }); }}>×</button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={handleStudentSubmit}>
                                    <div className="form-group">
                                        <label className="form-label">Student Name *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Class *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.class}
                                                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                                                placeholder="e.g., 10"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Section</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.section}
                                                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                                                placeholder="e.g., A"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Roll No</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.rollNo}
                                            onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                                        />
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); setEditingStudent(null); setFormData({ name: '', rollNo: '', class: '', section: '' }); }}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            {editingStudent ? 'Update Student' : 'Add Student'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Import Modal */}
            <AnimatePresence>
                {showImportModal && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowImportModal(false)}
                    >
                        <motion.div
                            className="modal"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2 className="modal-title">Import Students from Excel</h2>
                                <button className="modal-close" onClick={() => setShowImportModal(false)}>×</button>
                            </div>
                            <div className="modal-body">
                                <div className="import-instructions">
                                    <p>Your Excel file should have these columns:</p>
                                    <ul>
                                        <li><strong>Name</strong> or <strong>Student Name</strong> (required)</li>
                                        <li><strong>Class</strong> (required)</li>
                                        <li><strong>Section</strong> (optional)</li>
                                        <li><strong>Roll No</strong> or <strong>RollNo</strong> (optional)</li>
                                    </ul>
                                </div>

                                <div className="upload-zone">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleImport}
                                        className="upload-input"
                                        id="fileUpload"
                                    />
                                    <label htmlFor="fileUpload" className="upload-label">
                                        {importing ? (
                                            <>
                                                <div className="spinner"></div>
                                                <span>Importing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="upload-icon">📁</span>
                                                <span>Click or drag Excel file here</span>
                                                <span className="upload-hint">.xlsx, .xls, or .csv</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Layout>
    );
};

export default StudentManagement;

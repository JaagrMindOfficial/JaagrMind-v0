import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFileExport, faFileImport, faUserPlus, faPenToSquare, faSearch,
    faTrash, faUsersGear, faRotateRight, faCheck, faXmark, faEye,
    faLink, faClipboardList, faArrowUp, faUserGraduate, faChartLine, faRepeat
} from '@fortawesome/free-solid-svg-icons';
import Layout from '../../components/common/Layout';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';
import './StudentManagement.css';
import StudentHistoryModal from './StudentHistoryModal';

const StudentManagement = () => {
    const navigate = useNavigate();
    const toast = useToast();

    // Sub-tab state
    const [activeSubTab, setActiveSubTab] = useState('students');

    // === Students State ===
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [filters, setFilters] = useState({ class: '', section: '', status: '', schoolId: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({ name: '', rollNo: '', class: '', section: '' });
    const [editingStudent, setEditingStudent] = useState(null);
    const fileInputRef = useRef(null);
    const [importing, setImporting] = useState(false);

    // === History Modal State ===
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedStudentForHistory, setSelectedStudentForHistory] = useState(null);

    // === Shared Selection State (used by both tabs) ===
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    // === Check-ins State ===
    const [tests, setTests] = useState([]);
    const [selectedTest, setSelectedTest] = useState(null);
    const [testStatus, setTestStatus] = useState([]);
    const [copiedLink, setCopiedLink] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignTarget, setAssignTarget] = useState({ type: 'all', class: '', section: '' });
    const [assigning, setAssigning] = useState(false);

    // === Promote State ===
    const [promoting, setPromoting] = useState(false);

    useEffect(() => {
        fetchStudents();
        fetchClasses();
        fetchBranches();
        fetchTests();
    }, []);

    // ==================== STUDENT HANDLERS ====================

    const fetchStudents = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.class) params.append('class', filters.class);
            if (filters.section) params.append('section', filters.section);
            if (filters.status) params.append('status', filters.status);
            if (filters.schoolId) params.append('schoolId', filters.schoolId);

            const response = await api.get(`/api/school/students?${params}`);
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
            setClasses(response.data.classes || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
        }
    };

    const fetchBranches = async () => {
        try {
            const response = await api.get('/api/school/branches');
            setBranches(response.data || []);
        } catch (error) {
            console.error('Error fetching branches:', error);
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

            if (response.data.duplicates && response.data.duplicates.length > 0) {
                const dupNames = response.data.duplicates.slice(0, 5).map(d => d.name).join(', ');
                const more = response.data.duplicates.length > 5 ? ` and ${response.data.duplicates.length - 5} more` : '';
                toast.warning(`Skipped ${response.data.duplicates.length} duplicate(s): ${dupNames}${more}`);
            }

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
            toast.success('Student deleted');
        } catch (error) {
            console.error('Error deleting student:', error);
            toast.error('Error deleting student');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedStudents.length === 0) return;
        if (!window.confirm(`Delete ${selectedStudents.length} selected students? This cannot be undone.`)) return;

        try {
            await api.post('/api/school/students/bulk-delete', { studentIds: selectedStudents });
            toast.success(`${selectedStudents.length} students deleted`);
            setSelectedStudents([]);
            setSelectAll(false);
            fetchStudents();
            fetchClasses();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting students');
        }
    };

    const handleExportIds = async () => {
        try {
            const response = await api.post('/api/school/export-ids', {
                studentIds: selectedStudents.length > 0 ? selectedStudents : undefined,
                class: selectedStudents.length === 0 && filters.class ? filters.class : undefined,
                section: selectedStudents.length === 0 && filters.section ? filters.section : undefined
            }, {
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

    const handlePromoteClass = async () => {
        const hasSelection = selectedStudents.length > 0;
        const hasFilter = filters.class || filters.section;

        let confirmMsg;
        if (hasSelection) {
            confirmMsg = `Update class for ${selectedStudents.length} selected student(s) to the next class? (Max class 12)`;
        } else if (hasFilter) {
            confirmMsg = `Update class for all students matching current filters to the next class? (Max class 12)`;
        } else {
            confirmMsg = 'Update class for ALL students to the next class? (Max class 12)\n\nTip: Use filters or select specific students first to target a subset.';
        }

        if (!window.confirm(confirmMsg)) return;
        setPromoting(true);
        try {
            const response = await api.put('/api/school/students/promote-class', {
                studentIds: hasSelection ? selectedStudents : undefined,
                filterClass: !hasSelection && filters.class ? filters.class : undefined,
                filterSection: !hasSelection && filters.section ? filters.section : undefined
            });
            toast.success(response.data.message);
            setSelectedStudents([]);
            setSelectAll(false);
            fetchStudents();
            fetchClasses();
        } catch (error) {
            toast.error('Error promoting classes');
        } finally {
            setPromoting(false);
        }
    };

    const applyFilters = () => {
        setLoading(true);
        setSelectedStudents([]);
        setSelectAll(false);
        fetchStudents();
        // Also re-fetch test status if on checkins tab
        if (activeSubTab === 'checkins' && selectedTest) {
            fetchTestStatus(selectedTest._id, filters.class, filters.section);
        }
    };

    // ==================== CHECK-IN HANDLERS ====================

    const fetchTests = async () => {
        try {
            const response = await api.get('/api/school/tests');
            setTests(response.data);
            if (response.data.length > 0) {
                setSelectedTest(response.data[0]);
                fetchTestStatus(response.data[0]._id);
            }
        } catch (error) {
            console.error('Error fetching tests:', error);
        }
    };

    const fetchTestStatus = async (assessmentId, classFilter = '', sectionFilter = '') => {
        try {
            let url = `/api/school/test-status?assessmentId=${assessmentId}`;
            if (classFilter) url += `&class=${classFilter}`;
            if (sectionFilter) url += `&section=${sectionFilter}`;
            const response = await api.get(url);
            setTestStatus(response.data);
            setSelectedStudents([]);
            setSelectAll(false);
        } catch (error) {
            console.error('Error fetching status:', error);
        }
    };

    const handleCopyLink = async (test) => {
        try {
            const response = await api.get(`/api/school/assessment-link/${test._id}`);
            await navigator.clipboard.writeText(response.data.link);
            setCopiedLink(test._id);
            setTimeout(() => setCopiedLink(null), 2000);
        } catch (error) {
            toast.error('Error copying link');
        }
    };

    const handleReassignTest = async (studentId) => {
        if (!selectedTest) return;
        if (!window.confirm('Re-assign this check-in? The student will be able to take it again. Previous attempts will be saved.')) return;

        try {
            // Using assign endpoint which now supports re-assignment
            await api.post('/api/school/tests/assign', {
                assessmentId: selectedTest._id,
                targetType: 'students',
                studentIds: [studentId]
            });
            toast.success('Check-in re-assigned successfully');
            fetchTestStatus(selectedTest._id, filters.class, filters.section);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error re-assigning check-in');
        }
    };

    const handleViewHistory = (student) => {
        setSelectedStudentForHistory(student);
        setShowHistoryModal(true);
    };

    const handleAssignTest = async () => {
        if (!selectedTest) return;
        setAssigning(true);
        try {
            await api.post('/api/school/tests/assign', {
                assessmentId: selectedTest._id,
                targetType: assignTarget.type,
                targetClass: assignTarget.class || undefined,
                targetSection: assignTarget.section || undefined
            });
            toast.success('Check-in assigned successfully!');
            setShowAssignModal(false);
            fetchTestStatus(selectedTest._id, filters.class, filters.section);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error assigning check-in');
        } finally {
            setAssigning(false);
        }
    };

    const handleAssignToSelected = async () => {
        if (!selectedTest || selectedStudents.length === 0) return;
        setAssigning(true);
        try {
            await api.post('/api/school/tests/assign', {
                assessmentId: selectedTest._id,
                targetType: 'students',
                studentIds: selectedStudents
            });
            toast.success(`Check-in assigned to ${selectedStudents.length} students!`);
            fetchTestStatus(selectedTest._id, filters.class, filters.section);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error assigning check-in');
        } finally {
            setAssigning(false);
        }
    };

    const handleUnassignFromSelected = async () => {
        if (!selectedTest || selectedStudents.length === 0) return;
        if (!window.confirm(`Unassign check-in from ${selectedStudents.length} students?`)) return;
        setAssigning(true);
        try {
            await api.post('/api/school/tests/unassign', {
                assessmentId: selectedTest._id,
                studentIds: selectedStudents
            });
            toast.success('Check-in unassigned from selected students');
            fetchTestStatus(selectedTest._id, filters.class, filters.section);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error unassigning check-in');
        } finally {
            setAssigning(false);
        }
    };

    // ==================== SHARED SELECTION HANDLERS ====================

    const toggleStudentSelection = (studentId) => {
        if (selectedStudents.includes(studentId)) {
            setSelectedStudents(selectedStudents.filter(id => id !== studentId));
        } else {
            setSelectedStudents([...selectedStudents, studentId]);
        }
    };

    const handleSelectAll = (checked) => {
        setSelectAll(checked);
        if (checked) {
            if (activeSubTab === 'students') {
                const filteredStudents = students.filter(student =>
                    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    student.accessId.toLowerCase().includes(searchQuery.toLowerCase())
                );
                setSelectedStudents(filteredStudents.map(s => s._id));
            } else {
                setSelectedStudents(testStatus.map(s => s._id));
            }
        } else {
            setSelectedStudents([]);
        }
    };

    // Reset selection when switching tabs
    const switchSubTab = (tab) => {
        setActiveSubTab(tab);
        setSelectedStudents([]);
        setSelectAll(false);
    };

    // ==================== DERIVED DATA ====================

    const uniqueClasses = [...new Set(classes.map(c => c._id.class))];
    const sectionsForClass = filters.class
        ? [...new Set(classes.filter(c => c._id.class === filters.class).map(c => c._id.section))]
        : [];

    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.accessId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const completedCount = testStatus.filter(s => s.status === 'Completed').length;
    const pendingCount = testStatus.filter(s => s.status === 'Pending').length;

    // ==================== RENDER ====================

    return (
        <Layout title="Student Management" subtitle="Manage students and check-ins">
            {/* Sub-Tab Toggle */}
            <div className="sub-tab-container">
                <button
                    className={`sub-tab-btn ${activeSubTab === 'students' ? 'active' : ''}`}
                    onClick={() => switchSubTab('students')}
                >
                    <FontAwesomeIcon icon={faUserGraduate} />
                    <span>Students</span>
                </button>
                <button
                    className={`sub-tab-btn ${activeSubTab === 'checkins' ? 'active' : ''}`}
                    onClick={() => switchSubTab('checkins')}
                >
                    <FontAwesomeIcon icon={faClipboardList} />
                    <span>Check-ins</span>
                </button>
            </div>

            {/* Shared Filter Bar */}
            <div className="actions-bar">
                <div className="filter-container">
                    <div className="filter-row">
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

                        {branches.length > 0 && (
                            <select
                                className="form-input"
                                value={filters.schoolId}
                                onChange={(e) => setFilters({ ...filters, schoolId: e.target.value })}
                            >
                                <option value="">All Branches</option>
                                {branches.map(b => (
                                    <option key={b._id} value={b._id}>{b.name}</option>
                                ))}
                            </select>
                        )}

                        <select
                            className="form-input"
                            value={filters.class}
                            onChange={(e) => setFilters({ ...filters, class: e.target.value, section: '' })}
                        >
                            <option value="">All Classes</option>
                            {uniqueClasses.map(c => (
                                <option key={c} value={c}>Class {c}</option>
                            ))}
                        </select>

                        {filters.class && sectionsForClass.length > 0 && (
                            <select
                                className="form-input"
                                value={filters.section}
                                onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                            >
                                <option value="">All Sections</option>
                                {sectionsForClass.map(s => (
                                    <option key={s} value={s}>{s || 'No Section'}</option>
                                ))}
                            </select>
                        )}

                        {activeSubTab === 'students' && (
                            <select
                                className="form-input"
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            >
                                <option value="">All Status</option>
                                <option value="completed">Completed</option>
                                <option value="pending">Pending</option>
                            </select>
                        )}
                    </div>

                    <div className="filter-actions-row">
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                                setFilters({ class: '', section: '', status: '', schoolId: '' });
                                setSearchQuery('');
                                setTimeout(applyFilters, 0);
                            }}
                        >
                            <FontAwesomeIcon icon={faRotateRight} /> Reset Filters
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={applyFilters}>
                            Apply
                        </button>
                    </div>
                </div>

                {/* Action Buttons - change based on sub-tab */}
                <div className="action-buttons">
                    {activeSubTab === 'students' ? (
                        <>
                            {selectedStudents.length > 0 && (
                                <motion.button
                                    className="btn btn-danger"
                                    onClick={handleBulkDelete}
                                    whileHover={{ scale: 1.02 }}
                                >
                                    <FontAwesomeIcon icon={faTrash} /> Delete {selectedStudents.length}
                                </motion.button>
                            )}
                            <motion.button
                                className="btn btn-outline"
                                onClick={handlePromoteClass}
                                disabled={promoting}
                                whileHover={{ scale: 1.02 }}
                            >
                                <FontAwesomeIcon icon={faArrowUp} /> {promoting ? 'Updating...' : 'Update Class'}
                            </motion.button>
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
                                onClick={() => { setEditingStudent(null); setFormData({ name: '', rollNo: '', class: '', section: '' }); setShowModal(true); }}
                                whileHover={{ scale: 1.02 }}
                            >
                                <FontAwesomeIcon icon={faUserPlus} /> Add Student
                            </motion.button>
                        </>
                    ) : (
                        <>
                            {selectedStudents.length > 0 && (
                                <>
                                    <button
                                        className="btn btn-success btn-sm"
                                        onClick={handleAssignToSelected}
                                        disabled={assigning}
                                    >
                                        <FontAwesomeIcon icon={faCheck} /> Assign to {selectedStudents.length}
                                    </button>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={handleUnassignFromSelected}
                                        disabled={assigning}
                                    >
                                        <FontAwesomeIcon icon={faXmark} /> Unassign from {selectedStudents.length}
                                    </button>
                                </>
                            )}
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowAssignModal(true)}
                            >
                                <FontAwesomeIcon icon={faUsersGear} /> Bulk Assign
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ==================== STUDENTS TAB CONTENT ==================== */}
            {activeSubTab === 'students' && (
                <>
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
                            {filteredStudents.length > 0 ? (
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectAll}
                                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                                    />
                                                </th>
                                                <th>Name</th>
                                                <th>Access ID</th>
                                                <th>Branch</th>
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
                                                const completedTests = student.testStatus?.filter(t => t.isCompleted).length || 0;
                                                const totalTests = student.testStatus?.length || 0;
                                                return (
                                                    <tr
                                                        key={student._id}
                                                        className={selectedStudents.includes(student._id) ? 'selected-row' : ''}
                                                    >
                                                        <td>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedStudents.includes(student._id)}
                                                                onChange={() => toggleStudentSelection(student._id)}
                                                            />
                                                        </td>
                                                        <td className="font-medium">{student.name}</td>
                                                        <td>
                                                            <code className="access-id-code">{student.accessId}</code>
                                                        </td>
                                                        <td>
                                                            {student.schoolId?.name || (branches.find(b => b._id === student.schoolId)?.name) || 'Main'}
                                                        </td>
                                                        <td>{student.class}</td>
                                                        <td>{student.section || '-'}</td>
                                                        <td>{student.rollNo || '-'}</td>
                                                        <td>
                                                            <span className={`badge ${hasCompleted ? 'badge-success' : 'badge-warning'}`}>
                                                                {totalTests > 0 ? `${completedTests}/${totalTests}` : 'Pending'}
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
                                                                <button
                                                                    className="icon-btn danger"
                                                                    onClick={() => handleDelete(student._id)}
                                                                    title="Delete"
                                                                >
                                                                    <FontAwesomeIcon icon={faTrash} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : students.length > 0 && filteredStudents.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-state-icon"><FontAwesomeIcon icon={faSearch} /></div>
                                    <h3 className="empty-state-title">No Results Found</h3>
                                    <p className="empty-state-text">No students match "{searchQuery}"</p>
                                    <button className="btn btn-secondary" onClick={() => setSearchQuery('')}>
                                        Clear Search
                                    </button>
                                </div>
                            ) : (
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
                            )}
                        </motion.div>
                    )}
                </>
            )}

            {/* ==================== CHECK-INS TAB CONTENT ==================== */}
            {activeSubTab === 'checkins' && (
                <>
                    {/* Test Cards */}
                    <div className="tests-overview">
                        {tests.map((test, index) => (
                            <motion.div
                                key={test._id}
                                className={`test-card ${selectedTest?._id === test._id ? 'active' : ''}`}
                                onClick={() => {
                                    setSelectedTest(test);
                                    fetchTestStatus(test._id, filters.class, filters.section);
                                }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ scale: 1.02 }}
                            >
                                <div className="test-card-icon">
                                    <FontAwesomeIcon icon={faClipboardList} />
                                </div>
                                <div className="test-card-info">
                                    <h3>{test.title}</h3>
                                    <p>{test.isDefault ? 'Default Check-in' : 'Custom Check-in'}</p>
                                </div>
                                <div className="test-card-actions">
                                    <motion.button
                                        className={`btn btn-sm ${copiedLink === test._id ? 'btn-success' : 'btn-secondary'}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopyLink(test);
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {copiedLink === test._id ? (
                                            <span><FontAwesomeIcon icon={faCheck} /> Copied!</span>
                                        ) : (
                                            <span><FontAwesomeIcon icon={faLink} /> Copy Link</span>
                                        )}
                                    </motion.button>
                                    <motion.button
                                        className="btn btn-sm btn-secondary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/preview/assessment/${test._id}`);
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FontAwesomeIcon icon={faEye} /> Preview
                                    </motion.button>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {selectedTest && (
                        <>
                            {/* Stats */}
                            <div className="test-actions-bar">
                                <div className="test-stats">
                                    <div className="test-stat">
                                        <span className="test-stat-value text-success">{completedCount}</span>
                                        <span className="test-stat-label">Completed</span>
                                    </div>
                                    <div className="test-stat">
                                        <span className="test-stat-value text-warning">{pendingCount}</span>
                                        <span className="test-stat-label">Pending</span>
                                    </div>
                                    <div className="test-stat">
                                        <span className="test-stat-value">{testStatus.length}</span>
                                        <span className="test-stat-label">Total Students</span>
                                    </div>
                                </div>
                            </div>

                            {/* Status Table */}
                            <motion.div
                                className="card"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <div className="card-header">
                                    <h3 className="card-title">Student Check-in Status</h3>
                                    <span className="text-muted">
                                        {selectedStudents.length > 0 && `${selectedStudents.length} selected`}
                                    </span>
                                </div>

                                {testStatus.length > 0 ? (
                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '40px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectAll}
                                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                                        />
                                                    </th>
                                                    <th>Student Name</th>
                                                    <th>Access ID</th>
                                                    <th>Class</th>
                                                    <th>Status</th>
                                                    <th>Completed At</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {testStatus
                                                    .filter(s =>
                                                        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                        s.accessId.toLowerCase().includes(searchQuery.toLowerCase())
                                                    )
                                                    .map((student) => (
                                                        <tr
                                                            key={student._id}
                                                            className={selectedStudents.includes(student._id) ? 'selected-row' : ''}
                                                        >
                                                            <td>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedStudents.includes(student._id)}
                                                                    onChange={() => toggleStudentSelection(student._id)}
                                                                />
                                                            </td>
                                                            <td className="font-medium">{student.name}</td>
                                                            <td>
                                                                <code className="access-id-code">{student.accessId}</code>
                                                            </td>
                                                            <td>{student.class} {student.section}</td>
                                                            <td>
                                                                <span className={`badge ${student.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>
                                                                    {student.status}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                {student.completedAt
                                                                    ? new Date(student.completedAt).toLocaleString()
                                                                    : '-'
                                                                }
                                                            </td>
                                                            <td>
                                                                {student.status === 'Completed' && (
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            className="btn btn-outline btn-sm"
                                                                            onClick={() => handleViewHistory(student)}
                                                                            title="View Attempt History"
                                                                        >
                                                                            <FontAwesomeIcon icon={faChartLine} /> History
                                                                        </button>
                                                                        <button
                                                                            className="btn btn-outline btn-sm"
                                                                            onClick={() => handleReassignTest(student._id)}
                                                                            title="Re-assign for new attempt"
                                                                        >
                                                                            <FontAwesomeIcon icon={faRepeat} /> Re-assign
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <p>No students found for this check-in</p>
                                    </div>
                                )}
                            </motion.div>
                        </>
                    )}
                </>
            )}

            {/* ==================== MODALS ==================== */}

            {/* Add/Edit Student Modal */}
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
                                            pattern="^[a-zA-Z\s]+$"
                                            title="Name should only contain letters and spaces"
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Class *</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={formData.class}
                                                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                                                placeholder="e.g., 10"
                                                required
                                                min="1"
                                                max="12"
                                                title="Class must be between 1 and 12"
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
                                                pattern="^[a-zA-Z]+$"
                                                title="Section should be an alphabet (e.g., A, B)"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Roll No *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.rollNo}
                                            onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                                            required
                                            pattern="^[a-zA-Z0-9]+$"
                                            title="Roll No should be alphanumeric"
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
                                    <p style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        💡 If a student with the same roll number already exists, their data will be updated instead of creating a duplicate.
                                    </p>
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

            {/* Assign Test Modal */}
            {showAssignModal && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <motion.div
                        className="modal"
                        onClick={e => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="modal-header">
                            <h2>Bulk Assign Check-in to Students</h2>
                            <button className="modal-close" onClick={() => setShowAssignModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Assignment Type</label>
                                <select
                                    className="form-input"
                                    value={assignTarget.type}
                                    onChange={(e) => setAssignTarget({ ...assignTarget, type: e.target.value })}
                                >
                                    <option value="all">All Students</option>
                                    <option value="class">By Class</option>
                                    <option value="section">By Class & Section</option>
                                </select>
                            </div>

                            {(assignTarget.type === 'class' || assignTarget.type === 'section') && (
                                <div className="form-group">
                                    <label className="form-label">Class</label>
                                    <select
                                        className="form-input"
                                        value={assignTarget.class}
                                        onChange={(e) => setAssignTarget({ ...assignTarget, class: e.target.value })}
                                    >
                                        <option value="">Select Class</option>
                                        {uniqueClasses.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {assignTarget.type === 'section' && assignTarget.class && (
                                <div className="form-group">
                                    <label className="form-label">Section</label>
                                    <select
                                        className="form-input"
                                        value={assignTarget.section}
                                        onChange={(e) => setAssignTarget({ ...assignTarget, section: e.target.value })}
                                    >
                                        <option value="">Select Section</option>
                                        {classes.filter(c => c._id.class === assignTarget.class).map(c => (
                                            <option key={c._id.section} value={c._id.section}>
                                                {c._id.section || 'No Section'} ({c.count} students)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleAssignTest}
                                disabled={assigning || (assignTarget.type !== 'all' && !assignTarget.class)}
                            >
                                {assigning ? 'Assigning...' : 'Assign Check-in'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* History Modal */}
            <StudentHistoryModal
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                student={selectedStudentForHistory}
                assessmentId={selectedTest?._id}
                assessmentTitle={selectedTest?.title}
            />

        </Layout>
    );
};

export default StudentManagement;

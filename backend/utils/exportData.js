const ExcelJS = require('exceljs');

// Calculate bucket label based on score
const getBucketLabel = (score) => {
    if (score >= 8 && score <= 14) {
        return 'Skill Stable';
    } else if (score >= 15 && score <= 22) {
        return 'Skill Emerging';
    } else if (score >= 23 && score <= 32) {
        return 'Skill Support Needed';
    }
    return 'Unknown';
};

// Get section name from code
const getSectionName = (code) => {
    const sections = {
        'A': 'Focus & Attention',
        'B': 'Self-Esteem & Inner Confidence',
        'C': 'Social Confidence & Interaction',
        'D': 'Digital Hygiene & Self-Control'
    };
    return sections[code] || code;
};

// Export submissions to Excel
const exportSubmissionsToExcel = async (submissions, filters = {}) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Student Assessment Data');

    // Define columns
    worksheet.columns = [
        { header: 'Student Name', key: 'studentName', width: 25 },
        { header: 'Access ID', key: 'accessId', width: 20 },
        { header: 'School', key: 'schoolName', width: 30 },
        { header: 'Class', key: 'class', width: 10 },
        { header: 'Section', key: 'section', width: 10 },
        { header: 'Total Score', key: 'totalScore', width: 12 },
        { header: 'Focus & Attention', key: 'sectionA', width: 18 },
        { header: 'Self-Esteem', key: 'sectionB', width: 15 },
        { header: 'Social Confidence', key: 'sectionC', width: 18 },
        { header: 'Digital Hygiene', key: 'sectionD', width: 15 },
        { header: 'Primary Skill Area', key: 'primarySkillArea', width: 25 },
        { header: 'Overall Status', key: 'bucket', width: 20 },
        { header: 'Time Taken (min)', key: 'timeTaken', width: 15 },
        { header: 'Submitted At', key: 'submittedAt', width: 20 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB993E9' }
    };

    // Add data rows
    submissions.forEach(sub => {
        worksheet.addRow({
            studentName: sub.studentId?.name || 'N/A',
            accessId: sub.studentId?.accessId || 'N/A',
            schoolName: sub.schoolId?.name || 'N/A',
            class: sub.studentId?.class || 'N/A',
            section: sub.studentId?.section || 'N/A',
            totalScore: sub.totalScore,
            sectionA: `${sub.sectionScores?.A || 0} (${getBucketLabel(sub.sectionScores?.A || 0)})`,
            sectionB: `${sub.sectionScores?.B || 0} (${getBucketLabel(sub.sectionScores?.B || 0)})`,
            sectionC: `${sub.sectionScores?.C || 0} (${getBucketLabel(sub.sectionScores?.C || 0)})`,
            sectionD: `${sub.sectionScores?.D || 0} (${getBucketLabel(sub.sectionScores?.D || 0)})`,
            primarySkillArea: sub.primarySkillArea || 'N/A',
            bucket: sub.assignedBucket,
            timeTaken: Math.round((sub.timeTaken || 0) / 60 * 10) / 10,
            submittedAt: sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'N/A'
        });
    });

    return workbook;
};

// Export student access IDs to Excel
const exportAccessIdsToExcel = async (students, schoolName) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Student Access IDs');

    worksheet.columns = [
        { header: 'S.No', key: 'sno', width: 8 },
        { header: 'Student Name', key: 'name', width: 30 },
        { header: 'Roll No', key: 'rollNo', width: 15 },
        { header: 'Class', key: 'class', width: 10 },
        { header: 'Section', key: 'section', width: 10 },
        { header: 'Access ID', key: 'accessId', width: 25 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB993E9' }
    };

    students.forEach((student, index) => {
        worksheet.addRow({
            sno: index + 1,
            name: student.name,
            rollNo: student.rollNo || '',
            class: student.class,
            section: student.section || '',
            accessId: student.accessId
        });
    });

    return workbook;
};

// Calculate analytics data
const calculateAnalytics = (submissions) => {
    const total = submissions.length;
    if (total === 0) {
        return {
            totalSubmissions: 0,
            avgScore: 0,
            avgTimeTaken: 0,
            bucketDistribution: {},
            sectionAverages: { A: 0, B: 0, C: 0, D: 0 }
        };
    }

    const bucketDistribution = {};
    let totalScore = 0;
    let totalTime = 0;
    const sectionTotals = { A: 0, B: 0, C: 0, D: 0 };

    submissions.forEach(sub => {
        totalScore += sub.totalScore || 0;
        totalTime += sub.timeTaken || 0;

        const bucket = sub.assignedBucket || 'Unknown';
        bucketDistribution[bucket] = (bucketDistribution[bucket] || 0) + 1;

        if (sub.sectionScores) {
            sectionTotals.A += sub.sectionScores.A || 0;
            sectionTotals.B += sub.sectionScores.B || 0;
            sectionTotals.C += sub.sectionScores.C || 0;
            sectionTotals.D += sub.sectionScores.D || 0;
        }
    });

    return {
        totalSubmissions: total,
        avgScore: Math.round(totalScore / total * 10) / 10,
        avgTimeTaken: Math.round(totalTime / total),
        bucketDistribution,
        sectionAverages: {
            A: Math.round(sectionTotals.A / total * 10) / 10,
            B: Math.round(sectionTotals.B / total * 10) / 10,
            C: Math.round(sectionTotals.C / total * 10) / 10,
            D: Math.round(sectionTotals.D / total * 10) / 10
        }
    };
};

module.exports = {
    getBucketLabel,
    getSectionName,
    exportSubmissionsToExcel,
    exportAccessIdsToExcel,
    calculateAnalytics
};

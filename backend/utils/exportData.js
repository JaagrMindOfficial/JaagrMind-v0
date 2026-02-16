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
            sectionAverages: { A: 0, B: 0, C: 0, D: 0 },
            sectionDistributions: {
                A: { 'Skill Stable': 0, 'Skill Emerging': 0, 'Skill Support Needed': 0 },
                B: { 'Skill Stable': 0, 'Skill Emerging': 0, 'Skill Support Needed': 0 },
                C: { 'Skill Stable': 0, 'Skill Emerging': 0, 'Skill Support Needed': 0 },
                D: { 'Skill Stable': 0, 'Skill Emerging': 0, 'Skill Support Needed': 0 }
            }
        };
    }

    const bucketDistribution = {};
    let totalScore = 0;
    let totalTime = 0;
    const sectionTotals = { A: 0, B: 0, C: 0, D: 0 };

    // Initialize section distributions
    const sectionDistributions = {
        A: { 'Skill Stable': 0, 'Skill Emerging': 0, 'Skill Support Needed': 0 },
        B: { 'Skill Stable': 0, 'Skill Emerging': 0, 'Skill Support Needed': 0 },
        C: { 'Skill Stable': 0, 'Skill Emerging': 0, 'Skill Support Needed': 0 },
        D: { 'Skill Stable': 0, 'Skill Emerging': 0, 'Skill Support Needed': 0 }
    };

    // Grade-wise aggregation
    const gradeTotals = {};

    submissions.forEach(sub => {
        totalScore += sub.totalScore || 0;
        totalTime += sub.timeTaken || 0;

        const bucket = sub.assignedBucket || 'Unknown';
        bucketDistribution[bucket] = (bucketDistribution[bucket] || 0) + 1;

        // Grade processing
        const grade = sub.studentId?.class;
        if (grade) {
            if (!gradeTotals[grade]) {
                gradeTotals[grade] = { count: 0, A: 0, B: 0, C: 0, D: 0 };
            }
            gradeTotals[grade].count++;
        }

        if (sub.sectionScores) {
            // A: Focus & Attention
            sectionTotals.A += sub.sectionScores.A || 0;
            const bucketA = getBucketLabel(sub.sectionScores.A || 0);
            if (sectionDistributions.A[bucketA] !== undefined) sectionDistributions.A[bucketA]++;
            if (grade) gradeTotals[grade].A += sub.sectionScores.A || 0;

            // B: Self-Esteem
            sectionTotals.B += sub.sectionScores.B || 0;
            const bucketB = getBucketLabel(sub.sectionScores.B || 0);
            if (sectionDistributions.B[bucketB] !== undefined) sectionDistributions.B[bucketB]++;
            if (grade) gradeTotals[grade].B += sub.sectionScores.B || 0;

            // C: Social Confidence
            sectionTotals.C += sub.sectionScores.C || 0;
            const bucketC = getBucketLabel(sub.sectionScores.C || 0);
            if (sectionDistributions.C[bucketC] !== undefined) sectionDistributions.C[bucketC]++;
            if (grade) gradeTotals[grade].C += sub.sectionScores.C || 0;

            // D: Digital Hygiene
            sectionTotals.D += sub.sectionScores.D || 0;
            const bucketD = getBucketLabel(sub.sectionScores.D || 0);
            if (sectionDistributions.D[bucketD] !== undefined) sectionDistributions.D[bucketD]++;
            if (grade) gradeTotals[grade].D += sub.sectionScores.D || 0;
        }
    });

    // Calculate Grade Averages
    const averagesByGrade = Object.entries(gradeTotals).map(([grade, data]) => ({
        grade,
        A: Math.round(data.A / data.count * 10) / 10,
        B: Math.round(data.B / data.count * 10) / 10,
        C: Math.round(data.C / data.count * 10) / 10,
        D: Math.round(data.D / data.count * 10) / 10,
        count: data.count
    })).sort((a, b) => {
        // Try to sort numerically if grades are numbers, else string
        const numA = parseInt(a.grade);
        const numB = parseInt(b.grade);
        return !isNaN(numA) && !isNaN(numB) ? numA - numB : a.grade.localeCompare(b.grade);
    });

    // Calculate Trends (Monthly & Weekly)
    const monthlyTrends = {};
    const weeklyTrends = {};

    // Helper to get week number
    const getWeekNumber = (d) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-W${weekNo}`;
    };

    submissions.forEach(sub => {
        if (!sub.submittedAt || !sub.totalScore) return;

        const date = new Date(sub.submittedAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        const weekKey = getWeekNumber(date);

        // Monthly
        if (!monthlyTrends[monthKey]) {
            monthlyTrends[monthKey] = { totalScore: 0, count: 0, month: date.toLocaleString('default', { month: 'short' }), year: date.getFullYear() };
        }
        monthlyTrends[monthKey].totalScore += sub.totalScore;
        monthlyTrends[monthKey].count++;

        // Weekly
        if (!weeklyTrends[weekKey]) {
            weeklyTrends[weekKey] = { totalScore: 0, count: 0, week: weekKey };
        }
        weeklyTrends[weekKey].totalScore += sub.totalScore;
        weeklyTrends[weekKey].count++;
    });

    // Format trends for chart
    const monthlyTrendData = Object.entries(monthlyTrends)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, data]) => ({
            name: `${data.month} ${data.year}`,
            avgScore: Math.round(data.totalScore / data.count * 10) / 10,
            count: data.count
        }))
        .slice(-6); // Last 6 months

    const weeklyTrendData = Object.entries(weeklyTrends)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, data]) => ({
            name: data.week,
            avgScore: Math.round(data.totalScore / data.count * 10) / 10,
            count: data.count
        }))
        .slice(-8); // Last 8 weeks

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
        },
        sectionDistributions,
        averagesByGrade,
        trends: {
            monthly: monthlyTrendData,
            weekly: weeklyTrendData
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

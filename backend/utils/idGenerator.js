const { v4: uuidv4 } = require('uuid');

// Generate unique school ID
// Format: JM-XXXX-YYYY (randomized alphanumeric)
const generateSchoolId = async (School) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id;
    let exists = true;

    while (exists) {
        let part1 = '';
        let part2 = '';
        for (let i = 0; i < 4; i++) {
            part1 += chars.charAt(Math.floor(Math.random() * chars.length));
            part2 += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        id = `JM-${part1}-${part2}`;
        exists = await School.findOne({ schoolId: id });
    }
    return id;
};

// Generate random password for school
// Format: 8-12 characters with letters and numbers
const generateSchoolPassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// Generate unique student access ID
// Format: [SCHOOL_ABBREV]-[YEAR]-[RANDOM_16_CHARS] (e.g., CHS-2026-A9B2F3E72C4D8F1A)
const generateAccessId = (schoolName) => {
    // Get school abbreviation (first 3 letters of each word, max 4 chars)
    const words = schoolName.split(' ').filter(w => w.length > 0);
    let abbrev = '';

    if (words.length === 1) {
        abbrev = words[0].substring(0, 4).toUpperCase();
    } else {
        abbrev = words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
    }

    // Get current year
    const year = new Date().getFullYear();

    // Generate stronger random ID (16 characters)
    // Uses full UUID for maximum entropy
    const uuid = uuidv4().replace(/-/g, '');
    const randomPart = uuid.substring(0, 16).toUpperCase();

    return `${abbrev}-${year}-${randomPart}`;
};

// Generate bulk access IDs (ensures uniqueness)
const generateBulkAccessIds = async (Student, schoolName, count) => {
    const accessIds = [];
    const existingIds = new Set(
        (await Student.find({}, 'accessId')).map(s => s.accessId)
    );

    while (accessIds.length < count) {
        const newId = generateAccessId(schoolName);
        if (!existingIds.has(newId) && !accessIds.includes(newId)) {
            accessIds.push(newId);
        }
    }

    return accessIds;
};

module.exports = {
    generateSchoolId,
    generateSchoolPassword,
    generateAccessId,
    generateBulkAccessIds
};

const mongoose = require('mongoose');
const School = require('./models/School');
const ArchivedData = require('./models/ArchivedData');
const SchoolCredentials = require('./models/SchoolCredentials');
require('dotenv').config();

const email = 'jatin.24bcs10213@sst.scaler.com';

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        console.log(`Checking for email: ${email}`);

        const school = await School.findOne({ email: email.toLowerCase() });
        console.log('School found:', school ? school._id : 'null');
        if (school) {
            console.log('School details:', JSON.stringify(school, null, 2));
        }

        const creds = await SchoolCredentials.findOne({ email: email.toLowerCase() });
        console.log('SchoolCredentials found:', creds ? creds._id : 'null');

        const archived = await ArchivedData.findOne({
            $or: [
                { 'schoolData.email': email.toLowerCase() },
                { 'schoolData.contact.email': email.toLowerCase() }
            ]
        });
        console.log('ArchivedData found:', archived ? archived._id : 'null');

        // Also check if there is any other school with this email but maybe different casing?
        const regexSchool = await School.findOne({ email: new RegExp(`^${email}$`, 'i') });
        console.log('School found via Regex:', regexSchool ? regexSchool._id : 'null');

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

check();

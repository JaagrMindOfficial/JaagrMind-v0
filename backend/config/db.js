const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const dbName = process.env.NODE_ENV === 'production' ? 'jaagrmind' : 'test';
        console.log(`[MongoDB] Connecting to database: ${dbName} (${process.env.NODE_ENV} environment)...`);

        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            dbName: dbName
        });

        console.log(`[MongoDB] Connected: ${conn.connection.host}`);
        console.log(`[MongoDB] Database: ${conn.connection.name}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;

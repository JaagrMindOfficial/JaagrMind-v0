const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

// Configure AWS S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'jaagrmind-app';

// Generate unique filename
const generateFileName = (originalName, prefix = 'file') => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(originalName);
    return `${prefix}-${uniqueSuffix}${ext}`;
};

// Configure multer-s3 for logo uploads
const logoUpload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
            const fileName = generateFileName(file.originalname, 'logo');
            cb(null, `logos/${fileName}`);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});

// Configure multer-s3 for general file uploads
const fileUpload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
            const fileName = generateFileName(file.originalname, 'file');
            cb(null, `files/${fileName}`);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Get the public S3 URL for a file
const getS3Url = (key) => {
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
};

// Delete a file from S3
const deleteFromS3 = async (fileUrl) => {
    try {
        // Extract key from URL
        const urlParts = fileUrl.split('.amazonaws.com/');
        if (urlParts.length < 2) return false;

        const key = urlParts[1];

        await s3Client.send(new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        }));

        return true;
    } catch (error) {
        console.error('Error deleting from S3:', error);
        return false;
    }
};

module.exports = {
    s3Client,
    logoUpload,
    fileUpload,
    getS3Url,
    deleteFromS3,
    BUCKET_NAME
};

const multer = require('multer');
const path = require('path');
const cloudinary = require('../config/cloudinary');

// Use memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;
    
    if (allowedTypes.test(ext) && /image\/(jpeg|jpg|png|gif|webp)/.test(mimeType)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit per file
        files: 5 // Maximum 5 files
    }
});

// Middleware to upload files to Cloudinary
const uploadToCloudinary = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return next();
        }

        console.log(`Uploading ${req.files.length} files to Cloudinary...`);
        
        const uploadPromises = req.files.map(file => {
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'image',
                        folder: 'quickcare/issues',
                        transformation: [
                            { width: 1200, height: 1200, crop: 'limit' },
                            { quality: 'auto:good' },
                            { format: 'auto' }
                        ]
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            reject(error);
                        } else {
                            console.log('Cloudinary upload success:', result.public_id);
                            resolve({
                                filename: result.public_id,
                                originalName: file.originalname,
                                url: result.secure_url,
                                size: result.bytes,
                                cloudinaryId: result.public_id
                            });
                        }
                    }
                );
                
                uploadStream.end(file.buffer);
            });
        });

        const uploadedFiles = await Promise.all(uploadPromises);
        req.uploadedFiles = uploadedFiles;
        
        console.log('All files uploaded successfully:', uploadedFiles.length);
        next();
    } catch (error) {
        console.error('Upload to Cloudinary error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading images',
            error: error.message
        });
    }
};

// Export both the multer upload and cloudinary middleware
module.exports = {
    upload,
    uploadToCloudinary
};
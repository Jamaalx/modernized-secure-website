// backend/src/config/multer.js - File upload configuration
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads');
const documentsDir = path.join(uploadDir, 'documents');
const tempDir = path.join(uploadDir, 'temp');

// Create directories if they don't exist
[uploadDir, documentsDir, tempDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Initially save to temp directory
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with original extension
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        const extension = path.extname(file.originalname);
        const filename = `doc_${Date.now()}_${uniqueSuffix}${extension}`;
        cb(null, filename);
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    // Allowed MIME types
    const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif'
    ];
    
    // Check MIME type
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type not allowed: ${file.mimetype}`), false);
    }
};

// Create multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
        files: 1 // Only one file at a time
    }
});

// File validation middleware
const validateFile = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded'
        });
    }
    
    // Additional security checks
    const file = req.file;
    
    // Check file extension against MIME type
    const expectedExtensions = {
        'application/pdf': ['.pdf'],
        'application/msword': ['.doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'application/vnd.ms-excel': ['.xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        'application/vnd.ms-powerpoint': ['.ppt'],
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
        'text/plain': ['.txt'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif']
    };
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = expectedExtensions[file.mimetype] || [];
    
    if (!allowedExtensions.includes(fileExtension)) {
        // Clean up uploaded file
        fs.unlink(file.path, (err) => {
            if (err) console.error('Error deleting invalid file:', err);
        });
        
        return res.status(400).json({
            success: false,
            message: `File extension ${fileExtension} does not match MIME type ${file.mimetype}`
        });
    }
    
    // File passed validation
    next();
};

// Move file from temp to documents directory
const moveToDocuments = async (tempFilePath, newFilename) => {
    const documentsPath = path.join(documentsDir, newFilename);
    
    try {
        await fs.promises.rename(tempFilePath, documentsPath);
        return `documents/${newFilename}`;
    } catch (error) {
        console.error('Error moving file:', error);
        throw new Error('Failed to move file to documents directory');
    }
};

// Calculate file hash for integrity checking
const calculateFileHash = async (filePath) => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
};

// Clean up temp files older than 1 hour
const cleanupTempFiles = () => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    fs.readdir(tempDir, (err, files) => {
        if (err) {
            console.error('Error reading temp directory:', err);
            return;
        }
        
        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            
            fs.stat(filePath, (err, stats) => {
                if (err) return;
                
                if (stats.mtime.getTime() < oneHourAgo) {
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            console.error('Error deleting temp file:', err);
                        } else {
                            console.log(`Cleaned up temp file: ${file}`);
                        }
                    });
                }
            });
        });
    });
};

// Schedule temp file cleanup every hour
setInterval(cleanupTempFiles, 60 * 60 * 1000);

// Virus scanning function (placeholder - integrate with actual antivirus)
const scanForVirus = async (filePath) => {
    // TODO: Integrate with antivirus scanning service
    // For now, just check file size and basic patterns
    
    const stats = await fs.promises.stat(filePath);
    
    // Basic checks
    if (stats.size === 0) {
        throw new Error('Empty file detected');
    }
    
    if (stats.size > 100 * 1024 * 1024) { // 100MB
        throw new Error('File too large - potential security risk');
    }
    
    // Read first few bytes to check for executable signatures
    const buffer = Buffer.alloc(4);
    const fd = await fs.promises.open(filePath, 'r');
    await fd.read(buffer, 0, 4, 0);
    await fd.close();
    
    // Check for executable file signatures
    const signature = buffer.toString('hex');
    const executableSignatures = [
        '4d5a9000', // Windows PE
        '7f454c46', // Linux ELF
        'cafebabe', // Java class file
        '504b0304'  // ZIP (could contain executables)
    ];
    
    if (executableSignatures.includes(signature)) {
        throw new Error('Executable file detected - not allowed');
    }
    
    return true; // File passed basic checks
};

// Complete file processing workflow
const processUploadedFile = async (file, description = '') => {
    try {
        // 1. Virus scan
        await scanForVirus(file.path);
        
        // 2. Calculate file hash
        const fileHash = await calculateFileHash(file.path);
        
        // 3. Generate final filename
        const timestamp = Date.now();
        const randomSuffix = crypto.randomBytes(8).toString('hex');
        const extension = path.extname(file.originalname);
        const finalFilename = `${timestamp}_${randomSuffix}${extension}`;
        
        // 4. Move to documents directory
        const documentPath = await moveToDocuments(file.path, finalFilename);
        
        // 5. Return file metadata
        return {
            filename: finalFilename,
            originalName: file.originalname,
            filePath: documentPath,
            fileSize: file.size,
            fileHash: fileHash,
            mimeType: file.mimetype,
            description: description
        };
        
    } catch (error) {
        // Clean up file on error
        try {
            await fs.promises.unlink(file.path);
        } catch (cleanupError) {
            console.error('Error cleaning up file after processing error:', cleanupError);
        }
        
        throw error;
    }
};

module.exports = {
    upload: upload.single('document'), // Single file upload
    validateFile,
    processUploadedFile,
    moveToDocuments,
    calculateFileHash,
    scanForVirus,
    cleanupTempFiles
};
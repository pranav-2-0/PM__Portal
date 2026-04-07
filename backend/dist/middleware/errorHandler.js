"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    // Handle multer file size errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            error: 'File too large. Maximum file size is 100MB.'
        });
    }
    // Handle multer file type / field errors
    if (err.message && (err.message.includes('Only Excel') || err.message.includes('files are allowed') || err.code === 'LIMIT_UNEXPECTED_FILE')) {
        return res.status(400).json({
            error: err.message
        });
    }
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
};
exports.errorHandler = errorHandler;

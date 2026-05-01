// routes.js
const express = require('express');
const multer = require('multer');
const { generateProAssets } = require('./controller');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// FIX: Defect 1 - Wrap multer to catch file limit errors and return JSON
router.post('/generate-pro-assets', (req, res, next) => {
    upload.single('image')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(500).json({ success: false, error: err.message || "Unknown upload error." });
        }
        next();
    });
}, generateProAssets);

module.exports = router;
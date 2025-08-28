const express = require('express');
const { authenticateToken, requireRole } = require('../controllers/auth.controller');
const { deleteFile } = require('../controllers/file.controller');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// DELETE /api/files/:fileId - Delete uploaded file
router.delete('/:fileId', requireRole(['UPLOADER', 'REVIEWER']), deleteFile);

module.exports = router;

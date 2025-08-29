const express = require('express');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/roles');
const { uploadMultiple, uploadFiles, getFiles } = require('../controllers/file.controller');

const router = express.Router();

// All routes require authentication
router.use(auth);

// GET /api/periods/:periodId/files - Get files for period
router.get('/:periodId/files', getFiles);

// POST /api/periods/:periodId/files - Upload multiple files to period
router.post('/:periodId/files', requireRole(['UPLOADER', 'REVIEWER']), uploadMultiple, uploadFiles);

module.exports = router;

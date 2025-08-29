const express = require('express');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/roles');
const { deleteFile } = require('../controllers/file.controller');

const router = express.Router();

// All routes require authentication
router.use(auth);

// DELETE /api/files/:fileId - Delete uploaded file
router.delete('/:fileId', requireRole(['UPLOADER', 'REVIEWER']), deleteFile);

module.exports = router;

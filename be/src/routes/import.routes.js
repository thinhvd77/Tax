const express = require('express');
const multer = require('multer');
const sessionController = require('../controllers/session.controller');
const { calculatePayrollWithSession, previewPayrollWithSession } = require('../controllers/pit.controller');

const router = express.Router();
const upload = multer().array('dataFiles', 20);

// Session management routes
router.post('/sessions', sessionController.createSession);
router.get('/sessions', sessionController.getAllSessions);
router.get('/sessions/:sessionId', sessionController.getSession);
router.get('/sessions/month/:month', sessionController.getSessionsByMonth);
router.delete('/sessions/:sessionId', sessionController.deleteSession);

// File upload and processing with session
router.post('/sessions/:sessionId/upload', upload, calculatePayrollWithSession);

// Preview processed data without saving (for new uploads)
router.post('/sessions/:sessionId/preview', upload, previewPayrollWithSession);

// Download result file
router.get('/sessions/:sessionId/download', sessionController.downloadResult);

// Preview saved result data (for completed sessions)
router.get('/sessions/:sessionId/preview-saved', sessionController.previewSessionData);

module.exports = router;

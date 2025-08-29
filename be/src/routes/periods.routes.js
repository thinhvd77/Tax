const express = require('express');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/roles');
const {
    getAllPeriods,
    createPeriod,
    getPeriod,
    updatePeriodStatus,
    previewTaxCalculation,
    exportReport,
    clearPreviewCache,
    deletePeriod,
    diagnostic,
    deleteFilesByNamePattern
} = require('../controllers/taxPeriod.controller');

const router = express.Router();

// All routes require authentication
router.use(auth);

// GET /api/periods - List all tax periods
router.get('/', getAllPeriods);

// POST /api/periods - Create new tax period (UPLOADER and REVIEWER)
router.post('/', requireRole(['UPLOADER', 'REVIEWER', 'ADMIN']), createPeriod);

// GET /api/periods/:periodId - Get single period with files
router.get('/:periodId', getPeriod);

router.get('/:periodId/diagnostic', auth, diagnostic);

// Add route to delete specific file by name pattern
router.delete('/:periodId/files-by-name', auth, requireRole(['REVIEWER']), deleteFilesByNamePattern);

// PUT /api/periods/:periodId/status - Update period status (REVIEWER only)
router.put('/:periodId/status', requireRole(['REVIEWER']), updatePeriodStatus);

// POST /api/periods/:periodId/preview - Consolidate and preview (UPLOADER and REVIEWER)
router.post('/:periodId/preview', requireRole(['UPLOADER', 'REVIEWER']), previewTaxCalculation);

// DELETE /api/periods/:periodId/cache - Clear preview cache (UPLOADER and REVIEWER)
router.delete('/:periodId/cache', requireRole(['UPLOADER', 'REVIEWER']), clearPreviewCache);

// GET /api/periods/:periodId/export - Export final report (REVIEWER only)
router.get('/:periodId/export', requireRole(['REVIEWER']), exportReport);

// DELETE /api/periods/:periodId - Delete tax period (REVIEWER only)
router.delete('/:periodId', requireRole(['REVIEWER', 'ADMIN']), deletePeriod);

module.exports = router;

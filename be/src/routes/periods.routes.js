const express = require('express');
const { authenticateToken, requireRole } = require('../controllers/auth.controller');
const {
  getAllPeriods,
  createPeriod,
  getPeriod,
  updatePeriodStatus,
  previewTaxCalculation,
  exportReport,
  clearPreviewCache,
  deletePeriod
} = require('../controllers/taxPeriod.controller');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/periods - List all tax periods
router.get('/', getAllPeriods);

// POST /api/periods - Create new tax period (UPLOADER and REVIEWER)
router.post('/', requireRole(['UPLOADER', 'REVIEWER']), createPeriod);

// GET /api/periods/:periodId - Get single period with files
router.get('/:periodId', getPeriod);

router.get('/:periodId/diagnostic', authenticateToken, async (req, res) => {
    const { periodId } = req.params;
    const { UploadedFile } = require('../db');
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
        // Find all files for this period
        const files = await UploadedFile.findAll({
            where: { periodId }
        });
        
        const diagnostic = {
            periodId,
            totalFiles: files.length,
            files: []
        };
        
        for (const file of files) {
            const fileInfo = {
                fileId: file.fileId,
                fileName: file.fileName,
                filePath: file.filePath,
                uploadedAt: file.uploadedAt,
                isTruylinh: file.fileName.toLowerCase().includes('truylinh'),
                physicalFileExists: false,
                fileSize: 0,
                sampleData: null
            };
            
            try {
                const stats = await fs.stat(file.filePath);
                fileInfo.physicalFileExists = true;
                fileInfo.fileSize = stats.size;
                
                // If truylinh, read sample data
                if (fileInfo.isTruylinh) {
                    const xlsx = require('xlsx');
                    const fileContent = await fs.readFile(file.filePath);
                    const workbook = xlsx.read(fileContent, { type: 'buffer' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    fileInfo.sampleData = {
                        sheetName,
                        totalRows: data.length,
                        rowsFrom12To15: data.slice(11, 15).map((row, idx) => ({
                            rowNumber: 12 + idx,
                            stt: row[0],
                            columnB: row[1],
                            columnI: row[8],
                            columnJ: row[9],
                            columnK: row[10],
                            columnL: row[11],
                            columnM: row[12]
                        }))
                    };
                }
            } catch (err) {
                fileInfo.error = err.message;
            }
            
            diagnostic.files.push(fileInfo);
        }
        
        res.json(diagnostic);
    } catch (error) {
        console.error('Diagnostic error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add route to delete specific file by name pattern
router.delete('/:periodId/files-by-name', authenticateToken, requireRole('REVIEWER'), async (req, res) => {
    const { periodId } = req.params;
    const { pattern } = req.query; // e.g., ?pattern=truylinh
    
    if (!pattern) {
        return res.status(400).json({ message: 'Pattern parameter required' });
    }
    
    try {
        const { UploadedFile } = require('../db');
        const fs = require('fs').promises;
        
        // Find files matching the pattern
        // Fetch all files for period, then filter by name pattern (case-insensitive)
        const allFiles = await UploadedFile.findAll({
            where: { periodId }
        });
        const files = allFiles.filter(f => (f.fileName || '').toLowerCase().includes(String(pattern).toLowerCase()));
        
        console.log(`[DELETE] Found ${files.length} files matching pattern '${pattern}'`);
        
        for (const file of files) {
            console.log(`[DELETE] Removing file: ${file.fileName}`);
            
            // Delete physical file
            try {
                await fs.unlink(file.filePath);
                console.log(`[DELETE] Physical file deleted: ${file.filePath}`);
            } catch (err) {
                console.log(`[DELETE] Could not delete physical file: ${err.message}`);
            }
            
            // Delete database record
            await file.destroy();
        }
        
        res.json({ 
            message: `Deleted ${files.length} files matching pattern '${pattern}'`,
            deletedFiles: files.map(f => f.fileName)
        });
    } catch (error) {
        console.error('Delete by pattern error:', error);
        res.status(500).json({ error: error.message });
    }
});

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

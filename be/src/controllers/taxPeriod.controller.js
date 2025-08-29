const { 
  listPeriods,
  createPeriod: createPeriodService,
  getPeriod: getPeriodService,
  updateStatus: updateStatusService,
  previewCalculation: previewCalcService,
  exportReport: exportReportService,
  clearPreview: clearPreviewService,
  deletePeriod: deletePeriodService,
  diagnostic: diagnosticService,
  deleteFilesByNamePattern: deleteByPatternService,
  ServiceError
} = require('../services/taxPeriod.service');
const path = require('path');

// Add this diagnostic function after the imports
const resolveUploadedPath = (p) => {
  try {
    if (!p) return p;
    return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  } catch {
    return p; // fallback
  }
};

// Omit previous diagnostic utility from controller; if needed, move to service or dev script

// Get all tax periods
const getAllPeriods = async (req, res) => {
  try {
    const periods = await listPeriods();
    const formattedPeriods = periods.map(period => ({
      periodId: period.periodId,
      name: period.name,
      status: period.status,
      numberOfFiles: period.fileCount || 0,
      lastUpdated: period.updatedAt,
      createdBy: period.creator ? period.creator.fullName : 'Unknown',
      createdAt: period.createdAt
    }));

    res.json(formattedPeriods);

  } catch (error) {
    console.error('Error fetching periods:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Error fetching tax periods' });
  }
};

// Create new tax period
const createPeriod = async (req, res) => {
  try {
    const { name } = req.body;
    const createdBy = req.user.employeeCode;
    const period = await createPeriodService(name, createdBy);
    res.status(201).json({
      periodId: period.periodId,
      name: period.name,
      status: period.status,
      numberOfFiles: period.fileCount || 0,
      lastUpdated: period.updatedAt,
      createdBy: period.creator ? period.creator.fullName : 'Unknown',
      createdAt: period.createdAt
    });
  } catch (error) {
    console.error('Error creating period:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Error creating tax period' });
  }
};

// Get single tax period with files
const getPeriod = async (req, res) => {
  try {
    const { periodId } = req.params;
    const period = await getPeriodService(periodId);
    const formattedFiles = (period.files || []).map(file => ({
      fileId: file.fileId,
      fileName: file.fileName,
      fileSize: file.fileSize,
      uploadedBy: file.uploader ? file.uploader.fullName : 'Unknown',
      uploadedAt: file.uploadedAt,
      canDelete: req.user && (req.user.role === 'ADMIN' || file.uploadedBy === req.user.employeeCode)
    }));

    res.json({
      periodId: period.periodId,
      name: period.name,
      status: period.status,
      createdBy: period.creator ? period.creator.fullName : 'Unknown',
      createdAt: period.createdAt,
      updatedAt: period.updatedAt,
      files: formattedFiles,
      canModifyStatus: !!(req.user && req.user.role === 'ADMIN')
    });

  } catch (error) {
    console.error('Error fetching period:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Error fetching tax period' });
  }
};

// Update tax period status
const updatePeriodStatus = async (req, res) => {
  try {
    const { periodId } = req.params;
    const { status } = req.body;
    await updateStatusService(periodId, status);
    res.json({ message: 'Status updated successfully', status });
  } catch (error) {
    console.error('Error updating period status:', error);
    const statusCode = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(statusCode).json({ message: error.message || 'Error updating period status' });
  }
};

// Consolidate and preview tax calculation
const previewTaxCalculation = async (req, res) => {
  const { periodId } = req.params;
  try {
    const { period, data, bonusTitles, summary } = await previewCalcService(periodId);
    res.json({
      periodId: period.periodId,
      data,
      summary,
      totalRows: data.length,
      columns: data.length > 0 ? Object.keys(data[0]) : [],
      bonusTitles: bonusTitles || []
    });
  } catch (error) {
    console.error('Error in tax calculation preview:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Error processing tax calculation' });
  }
};

// Export final report
const exportReport = async (req, res) => {
  try {
    const { periodId } = req.params;
    const { filename, buffer } = await exportReportService(periodId);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting report:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Error exporting report' });
  }
};

// Clear preview cache
const clearPreviewCache = async (req, res) => {
  try {
    const { periodId } = req.params;
    await clearPreviewService(periodId);
    res.json({ message: 'Preview cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing preview cache:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Error clearing preview cache' });
  }
};

// Delete a tax period and its files
const deletePeriod = async (req, res) => {
  try {
    const { periodId } = req.params;
    await deletePeriodService(periodId);
    res.json({ message: 'Tax period deleted successfully' });
  } catch (error) {
    console.error('Error deleting tax period:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Error deleting tax period' });
  }
};

module.exports = {
  getAllPeriods,
  createPeriod,
  getPeriod,
  updatePeriodStatus,
  previewTaxCalculation,
  exportReport,
  clearPreviewCache,
  deletePeriod,
  // extra endpoints moved from routes inline logic
  diagnostic: async (req, res) => {
    try {
      const { periodId } = req.params;
      const result = await diagnosticService(periodId);
      res.json(result);
    } catch (error) {
      const status = error instanceof ServiceError && error.status ? error.status : 500;
      res.status(status).json({ message: error.message || 'Diagnostic failed' });
    }
  },
  deleteFilesByNamePattern: async (req, res) => {
    try {
      const { periodId } = req.params;
      const { pattern } = req.query;
      const result = await deleteByPatternService(periodId, pattern);
      res.json({ message: `Deleted ${result.deleted} files matching pattern '${pattern}'`, deletedFiles: result.deletedFiles });
    } catch (error) {
      const status = error instanceof ServiceError && error.status ? error.status : 500;
      res.status(status).json({ message: error.message || 'Delete by pattern failed' });
    }
  }
};

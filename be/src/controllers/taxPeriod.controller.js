const databaseManager = require('../core/DatabaseManager');
const fs = require('fs').promises;
const path = require('path');
const xlsx = require('xlsx');

// Add this diagnostic function after the imports
const resolveUploadedPath = (p) => {
  try {
    if (!p) return p;
    return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  } catch {
    return p; // fallback
  }
};

const diagnosticCheckFiles = async (periodId) => {
  console.log('\n========== DIAGNOSTIC FILE CHECK ==========');
  console.log('Period ID:', periodId);

  // Check database records using new DatabaseManager
  const repositories = databaseManager.getRepositories();
  const period = await repositories.taxPeriods.findWithRelations(periodId);

  if (!period) {
    console.log('Period not found in database');
    return;
  }

  console.log('\n[DATABASE RECORDS]');
  for (const file of period.files || []) {
    console.log(`  - ${file.fileName}`);
    console.log(`    ID: ${file.fileId}`);
    console.log(`    Path: ${file.filePath}`);
    console.log(`    Uploaded: ${file.uploadedAt}`);

    // Check if physical file exists
    try {
      const resolved = resolveUploadedPath(file.filePath);
      const stats = await fs.stat(resolved);
      console.log(`    Physical file exists: YES (${stats.size} bytes)`);

      // If it's a truylinh file, read and show sample data
      if (file.fileName.toLowerCase().includes('truylinh')) {
        console.log('    >>> TRUYLINH FILE DETECTED <<<');
        const fileContent = await fs.readFile(resolved);
        const workbook = xlsx.read(fileContent, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        console.log('    Sheet name:', sheetName);
        console.log('    Total rows:', data.length);
        console.log('    Sample data (rows 10-15):');
        for (let i = 10; i < Math.min(15, data.length); i++) {
          if (data[i] && data[i][0]) { // If row has data
            console.log(`      Row ${i + 1}: [${data[i][0]}, ${data[i][1]}, ${data[i][8]}, ${data[i][9]}, ${data[i][10]}, ${data[i][11]}, ${data[i][12]}]`);
          }
        }
      }
    } catch (err) {
      console.log(`    Physical file exists: NO (${err.message})`);
    }
  }

  // Check physical upload directory
  const uploadDir = path.join(process.cwd(), 'uploads', periodId);
  console.log('\n[PHYSICAL DIRECTORY]');
  console.log('Directory path:', uploadDir);

  try {
    const files = await fs.readdir(uploadDir);
    console.log('Files in directory:', files.length);
    for (const fileName of files) {
      const filePath = path.join(uploadDir, fileName);
      const stats = await fs.stat(filePath);
      console.log(`  - ${fileName} (${stats.size} bytes, modified: ${stats.mtime})`);
    }
  } catch (err) {
    console.log('Error reading directory:', err.message);
  }

  console.log('========== END DIAGNOSTIC ==========\n');
};

// Get all tax periods
const getAllPeriods = async (req, res) => {
  try {
    const repositories = databaseManager.getRepositories();
    const periods = await repositories.taxPeriods.findAllWithCreator();

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
    res.status(500).json({
      message: 'Error fetching tax periods'
    });
  }
};

// Create new tax period
const createPeriod = async (req, res) => {
  try {
    const { name } = req.body;
    const createdBy = req.user.employeeCode;

    if (!name) {
      return res.status(400).json({
        message: 'Period name is required'
      });
    }

    const repositories = databaseManager.getRepositories();
    // Check if period with same name already exists
    const existingPeriod = await repositories.taxPeriods.findOne({ where: { name } });
    if (existingPeriod) {
      return res.status(400).json({
        message: 'A tax period with this name already exists'
      });
    }

    const period = await repositories.taxPeriods.create({
      name,
      createdBy,
      status: 'IN_PROGRESS'
    });

    // Include creator info in response
    const periodWithCreator = await repositories.taxPeriods.findWithRelations(period.periodId);

    res.status(201).json({
      periodId: periodWithCreator.periodId,
      name: periodWithCreator.name,
      status: periodWithCreator.status,
      numberOfFiles: 0,
      lastUpdated: periodWithCreator.updatedAt,
      createdBy: periodWithCreator.creator ? periodWithCreator.creator.fullName : 'Unknown',
      createdAt: periodWithCreator.createdAt
    });

  } catch (error) {
    console.error('Error creating period:', error);
    res.status(500).json({
      message: 'Error creating tax period'
    });
  }
};

// Get single tax period with files
const getPeriod = async (req, res) => {
  try {
    const { periodId } = req.params;

    const repositories = databaseManager.getRepositories();
    const period = await repositories.taxPeriods.findWithRelations(periodId);

    if (!period) {
      return res.status(404).json({
        message: 'Tax period not found'
      });
    }

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
    res.status(500).json({
      message: 'Error fetching tax period'
    });
  }
};

// Update tax period status
const updatePeriodStatus = async (req, res) => {
  try {
    const { periodId } = req.params;
    const { status } = req.body;

    if (!['IN_PROGRESS', 'COMPLETED'].includes(status)) {
      return res.status(400).json({
        message: 'Invalid status'
      });
    }

    const repositories = databaseManager.getRepositories();
    const period = await repositories.taxPeriods.findById(periodId);
    if (!period) {
      return res.status(404).json({
        message: 'Tax period not found'
      });
    }

    await repositories.taxPeriods.updateStatus(periodId, status);

    res.json({
      message: 'Status updated successfully',
      status: status
    });

  } catch (error) {
    console.error('Error updating period status:', error);
    res.status(500).json({
      message: 'Error updating period status'
    });
  }
};

// Consolidate and preview tax calculation
const previewTaxCalculation = async (req, res) => {
  const { periodId } = req.params;
  try {
    await diagnosticCheckFiles(periodId);
    const repositories = databaseManager.getRepositories();
    const period = await repositories.taxPeriods.findWithRelations(periodId);

    if (!period) {
      return res.status(404).json({
        message: 'Tax period not found'
      });
    }

    if (!period.files || period.files.length === 0) {
      return res.status(400).json({
        message: 'No files uploaded for this period'
      });
    }

    console.log(`Processing ${period.files.length} files for period ${periodId}`);

    // Use the proven logic from pit.service.js
    const { processUploadedFiles } = require('../services/pit.service');

    // Convert UploadedFile records to the format expected by processUploadedFiles
    const files = [];
    for (const file of period.files) {
      try {
        console.log(`Reading file: ${file.fileName} (path: ${file.filePath})`);
        const resolvedPath = resolveUploadedPath(file.filePath);
        const fileBuffer = await fs.readFile(resolvedPath);

        files.push({
          buffer: fileBuffer,
          originalname: file.fileName,
          size: file.fileSize
        });
      } catch (fileError) {
        console.error(`Error reading file ${file.fileName}:`, fileError);
        continue;
      }
    }

    if (files.length === 0) {
      return res.status(400).json({
        message: 'No valid files could be processed'
      });
    }

    // Process files using the proven service logic
    const result = processUploadedFiles(files);
    if (result.error) {
      return res.status(400).json({
        message: result.error
      });
    }

    const { data, bonusTitles } = result;

    // Calculate summary statistics
    const employeeRows = data.filter(row => typeof row['STT'] === 'number');
    const summary = {
      totalEmployees: employeeRows.length,
      totalIncome: employeeRows.reduce((sum, row) => sum + (row['TỔNG THU NHẬP CHỊU THUẾ'] || 0), 0),
      totalTax: employeeRows.reduce((sum, row) => sum + (row['TỔNG THUẾ TNCN TẠM TÍNH'] || 0), 0),
      totalSalary: employeeRows.reduce((sum, row) => sum + (row['LƯƠNG V1'] || 0), 0)
    };

    console.log(`Processed successfully: ${employeeRows.length} employees, Total Tax: ${summary.totalTax}`);

    // Store preview data in the database
    await repositories.taxPeriods.updateById(periodId, {
      previewData: JSON.stringify({
        data: data,
        summary,
        bonusTitles,
        processedAt: new Date()
      })
    });

    res.json({
      periodId: period.periodId,
      data: data,
      summary,
      totalRows: data.length,
      columns: data.length > 0 ? Object.keys(data[0]) : [],
      bonusTitles: bonusTitles || []
    });

  } catch (error) {
    console.error('Error in tax calculation preview:', error);
    res.status(500).json({
      message: 'Error processing tax calculation',
      error: error.message
    });
  }
};

// Export final report
const exportReport = async (req, res) => {
  try {
    const { periodId } = req.params;

    const repositories = databaseManager.getRepositories();
    const period = await repositories.taxPeriods.findById(periodId);
    if (!period) {
      return res.status(404).json({
        message: 'Tax period not found'
      });
    }

    if (!period.previewData) {
      return res.status(400).json({
        message: 'No preview data available. Please run consolidation first.'
      });
    }

    const previewData = JSON.parse(period.previewData);

    // Create Excel workbook using the same formatting as the legacy system
    const worksheet = xlsx.utils.json_to_sheet(previewData.data);

    // Apply formatting similar to the legacy system
    const headers = Object.keys(previewData.data[0] || {});
    const range = xlsx.utils.decode_range(worksheet['!ref']);

    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const rowData = previewData.data[R - 1] || {};
      const isDeptRow = typeof rowData['STT'] !== 'number';

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = xlsx.utils.encode_cell({ r: R, c: C });
        let cell = worksheet[cell_address];
        if (!cell) { cell = worksheet[cell_address] = { t: 's', v: '' }; }

        if (isDeptRow) {
          if (!cell.s) cell.s = {};
          if (!cell.s.font) cell.s.font = {};
          cell.s.font.bold = true;
        }

        const currencyFormat = '#,##0';
        const currencyColumns = [
          'LƯƠNG V1', 'ĐHKQ', 'TỔNG THU NHẬP CHỊU THUẾ', "BHXH, BHYT, BHTN TRUY LĨNH", 'BHXH, BHYT, BHTN',
          'SỐ TIỀN GIẢM TRỪ', 'GIẢM TRỪ BẢN THÂN', 'TỔNG SỐ TIỀN GIẢM TRỪ',
          'THU NHẬP TÍNH THUẾ', 'TỔNG THUẾ TNCN TẠM TÍNH',
          ...(previewData.bonusTitles || [])
        ];
        const header = headers[C];
        if (currencyColumns.includes(header) && cell.t === 'n') {
          cell.z = currencyFormat;
        }
      }
    }

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Kết quả tính thuế');

    // Save file
    const resultsDir = path.join(__dirname, '../../results');
    await fs.mkdir(resultsDir, { recursive: true });

    const filename = `Tax_Report_${period.name.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
    const filePath = path.join(resultsDir, filename);

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    await fs.writeFile(filePath, buffer);

    // Update period
    await repositories.taxPeriods.setResultFile(periodId, `results/${filename}`);

    // Send file
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({
      message: 'Error exporting report'
    });
  }
};

// Clear preview cache
const clearPreviewCache = async (req, res) => {
  try {
    const { periodId } = req.params;

    const repositories = databaseManager.getRepositories();
    const period = await repositories.taxPeriods.findById(periodId);
    if (!period) {
      return res.status(404).json({
        message: 'Tax period not found'
      });
    }

    await repositories.taxPeriods.updateById(periodId, { previewData: null });

    res.json({
      message: 'Preview cache cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing preview cache:', error);
    res.status(500).json({
      message: 'Error clearing preview cache'
    });
  }
};

// Delete a tax period and its files
const deletePeriod = async (req, res) => {
  try {
    const { periodId } = req.params;

    const repositories = databaseManager.getRepositories();
    const period = await repositories.taxPeriods.findWithRelations(periodId);
    if (!period) {
      return res.status(404).json({
        message: 'Tax period not found'
      });
    }

    // Delete physical files for this period
    if (Array.isArray(period.files)) {
      for (const file of period.files) {
        try {
          const resolvedPath = resolveUploadedPath(file.filePath);
          await fs.unlink(resolvedPath);
        } catch (physicalError) {
          console.warn('Could not delete physical file:', physicalError.message);
        }
      }
    }

    // Remove the uploads directory for this period if exists
    try {
      const uploadDir = path.join(process.cwd(), 'uploads', String(periodId));
      await fs.rm(uploadDir, { recursive: true, force: true });
    } catch (dirError) {
      console.warn('Could not remove upload directory:', dirError.message);
    }

    // Delete database records
    await repositories.uploadedFiles.deleteByPeriodId(periodId);
    await repositories.taxPeriods.deleteById(periodId);

    res.json({
      message: 'Tax period deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tax period:', error);
    res.status(500).json({
      message: 'Error deleting tax period'
    });
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
  deletePeriod
};

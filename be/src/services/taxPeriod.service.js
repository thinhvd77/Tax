const fs = require('fs').promises;
const path = require('path');
const xlsx = require('xlsx');
const databaseManager = require('../config/DatabaseManager');

class ServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
  }
}

const getRepos = () => databaseManager.getRepositories();

async function listPeriods() {
  const { taxPeriods } = getRepos();
  return taxPeriods.findAllWithCreator();
}

async function createPeriod(name, createdBy) {
  if (!name) throw new ServiceError(400, 'Period name is required');
  const { taxPeriods } = getRepos();
  const existing = await taxPeriods.findOne({ where: { name } });
  if (existing) throw new ServiceError(400, 'A tax period with this name already exists');
  const period = await taxPeriods.create({ name, createdBy, status: 'IN_PROGRESS' });
  return taxPeriods.findWithRelations(period.periodId);
}

async function getPeriod(periodId) {
  const { taxPeriods } = getRepos();
  const period = await taxPeriods.findWithRelations(periodId);
  if (!period) throw new ServiceError(404, 'Tax period not found');
  return period;
}

async function updateStatus(periodId, status) {
  if (!['IN_PROGRESS', 'COMPLETED'].includes(status)) {
    throw new ServiceError(400, 'Invalid status');
  }
  const { taxPeriods } = getRepos();
  const existing = await taxPeriods.findById(periodId);
  if (!existing) throw new ServiceError(404, 'Tax period not found');
  await taxPeriods.updateStatus(periodId, status);
  return { status };
}

// Preview: read files from storage and compute via pit.service
async function previewCalculation(periodId) {
  const { taxPeriods } = getRepos();
  const period = await taxPeriods.findWithRelations(periodId);
  if (!period) throw new ServiceError(404, 'Tax period not found');
  if (!period.files || period.files.length === 0) {
    throw new ServiceError(400, 'No files uploaded for this period');
  }

  const { processUploadedFiles } = require('./pit.service');
  const files = [];
  for (const f of period.files) {
    try {
      const fileBuffer = await fs.readFile(path.isAbsolute(f.filePath) ? f.filePath : path.join(process.cwd(), f.filePath));
      files.push({ buffer: fileBuffer, originalname: f.fileName, size: f.fileSize });
    } catch (e) {
      // skip missing file
    }
  }

  if (files.length === 0) throw new ServiceError(400, 'No valid files could be processed');

  const result = processUploadedFiles(files);
  if (result.error) throw new ServiceError(400, result.error);

  const { data, bonusTitles } = result;

  const employeeRows = data.filter(row => typeof row['STT'] === 'number');
  const summary = {
    totalEmployees: employeeRows.length,
    totalIncome: employeeRows.reduce((s, r) => s + (r['TỔNG THU NHẬP CHỊU THUẾ'] || 0), 0),
    totalTax: employeeRows.reduce((s, r) => s + (r['TỔNG THUẾ TNCN TẠM TÍNH'] || 0), 0),
    totalSalary: employeeRows.reduce((s, r) => s + (r['LƯƠNG V1'] || 0), 0)
  };

  await taxPeriods.updateById(periodId, {
    previewData: JSON.stringify({ data, summary, bonusTitles, processedAt: new Date() })
  });

  return { period, data, bonusTitles, summary };
}

async function exportReport(periodId) {
  const { taxPeriods } = getRepos();
  const period = await taxPeriods.findById(periodId);
  if (!period) throw new ServiceError(404, 'Tax period not found');
  if (!period.previewData) throw new ServiceError(400, 'No preview data available. Please run consolidation first.');

  const previewData = JSON.parse(period.previewData);
  const worksheet = xlsx.utils.json_to_sheet(previewData.data);
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
        'LƯƠNG V1', 'ĐHKQ', 'TỔNG THU NHẬP CHỊU THUẾ', 'BHXH, BHYT, BHTN',
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
  const resultsDir = path.join(__dirname, '../../results');
  await fs.mkdir(resultsDir, { recursive: true });
  const filename = `Tax_Report_${period.name.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
  const filePath = path.join(resultsDir, filename);
  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  await fs.writeFile(filePath, buffer);
  await taxPeriods.setResultFile(periodId, `results/${filename}`);
  return { filename, buffer };
}

async function clearPreview(periodId) {
  const { taxPeriods } = getRepos();
  const period = await taxPeriods.findById(periodId);
  if (!period) throw new ServiceError(404, 'Tax period not found');
  await taxPeriods.updateById(periodId, { previewData: null });
  return { success: true };
}

async function deletePeriod(periodId) {
  const { taxPeriods, uploadedFiles } = getRepos();
  const period = await taxPeriods.findWithRelations(periodId);
  if (!period) throw new ServiceError(404, 'Tax period not found');

  // Remove physical files
  if (Array.isArray(period.files)) {
    for (const f of period.files) {
      try {
        const p = path.isAbsolute(f.filePath) ? f.filePath : path.join(process.cwd(), f.filePath);
        await fs.unlink(p);
      } catch {}
    }
  }
  try {
    const uploadDir = path.join(process.cwd(), 'uploads', String(periodId));
    await fs.rm(uploadDir, { recursive: true, force: true });
  } catch {}
  await uploadedFiles.deleteByPeriodId(periodId);
  await taxPeriods.deleteById(periodId);
  return { success: true };
}

async function diagnostic(periodId) {
  const { taxPeriods } = getRepos();
  const period = await taxPeriods.findWithRelations(periodId);
  if (!period) throw new ServiceError(404, 'Tax period not found');

  const diagnostic = {
    periodId,
    totalFiles: (period.files || []).length,
    files: []
  };

  for (const file of period.files || []) {
    const info = {
      fileId: file.fileId,
      fileName: file.fileName,
      filePath: file.filePath,
      uploadedAt: file.uploadedAt,
      isTruylinh: (file.fileName || '').toLowerCase().includes('truylinh'),
      physicalFileExists: false,
      fileSize: 0,
      sampleData: null
    };
    try {
      const p = path.isAbsolute(file.filePath) ? file.filePath : path.join(process.cwd(), file.filePath);
      const stats = await fs.stat(p);
      info.physicalFileExists = true;
      info.fileSize = stats.size;
      if (info.isTruylinh) {
        const content = await fs.readFile(p);
        const workbook = xlsx.read(content, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
        info.sampleData = {
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
    } catch (e) {
      info.error = e.message;
    }
    diagnostic.files.push(info);
  }

  const uploadDir = path.join(process.cwd(), 'uploads', String(periodId));
  try {
    const files = await fs.readdir(uploadDir);
    diagnostic.physicalDirectory = {
      path: uploadDir,
      files: await Promise.all(files.map(async (fname) => {
        const p = path.join(uploadDir, fname);
        try {
          const st = await fs.stat(p);
          return { name: fname, size: st.size, modified: st.mtime };
        } catch { return { name: fname, error: 'stat failed' }; }
      }))
    };
  } catch (e) {
    diagnostic.physicalDirectory = { path: uploadDir, error: e.message };
  }

  return diagnostic;
}

async function deleteFilesByNamePattern(periodId, pattern) {
  if (!pattern) throw new ServiceError(400, 'Pattern parameter required');
  const { uploadedFiles } = getRepos();
  // Fetch all files for period then filter by name pattern (case-insensitive)
  const all = await uploadedFiles.findByPeriodId(periodId);
  const matches = all.filter(f => (f.fileName || '').toLowerCase().includes(String(pattern).toLowerCase()));

  for (const f of matches) {
    try {
      const p = path.isAbsolute(f.filePath) ? f.filePath : path.join(process.cwd(), f.filePath);
      await fs.unlink(p);
    } catch {}
    await uploadedFiles.deleteById(f.fileId);
  }

  return { deleted: matches.length, deletedFiles: matches.map(f => f.fileName) };
}

module.exports = {
  listPeriods,
  createPeriod,
  getPeriod,
  updateStatus,
  previewCalculation,
  exportReport,
  clearPreview,
  deletePeriod,
  diagnostic,
  deleteFilesByNamePattern,
  ServiceError
};

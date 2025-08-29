const fs = require('fs').promises;
const path = require('path');
const databaseManager = require('../config/DatabaseManager');

class ServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
  }
}

// Helpers kept in service to decouple controllers from storage details
const resolveUploadedPath = (p) => {
  try {
    if (!p) return p;
    return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  } catch {
    return p;
  }
};

const decodeUnicodeFilename = (name) => {
  try {
    if (!name) return name;
    return Buffer.from(name, 'latin1').toString('utf8');
  } catch {
    return name;
  }
};

const getRepos = () => databaseManager.getRepositories();

const ensurePeriodExists = async (periodId) => {
  const { taxPeriods } = getRepos();
  const period = await taxPeriods.findById(periodId);
  if (!period) throw new ServiceError(404, 'Tax period not found');
  return period;
};

// Upload file records and update counters
async function uploadFiles(periodId, files, currentUser) {
  if (!files || files.length === 0) {
    throw new ServiceError(400, 'No files uploaded');
  }

  await ensurePeriodExists(periodId);
  const { uploadedFiles, taxPeriods } = getRepos();

  const created = [];
  for (const f of files) {
    const record = await uploadedFiles.create({
      periodId,
      fileName: decodeUnicodeFilename(f.originalname),
      filePath: f.path,
      uploadedBy: currentUser?.employeeCode,
      fileSize: f.size,
      contentType: f.mimetype
    });
    created.push(record);
  }

  await taxPeriods.updateFileCount(periodId, files.length);

  return created;
}

// List files for a period (raw), controller can format as needed
async function listFiles(periodId) {
  await ensurePeriodExists(periodId);
  const { uploadedFiles } = getRepos();
  return uploadedFiles.findByPeriodId(periodId);
}

// Delete a file (with permission check) and update counters
async function deleteFile(fileId, currentUser) {
  const { uploadedFiles, taxPeriods } = getRepos();
  const file = await uploadedFiles.findWithRelations(fileId);
  if (!file) throw new ServiceError(404, 'File not found');

  // Permission: admin or uploader
  if (currentUser?.role !== 'ADMIN' && file.uploadedBy !== currentUser?.employeeCode) {
    throw new ServiceError(403, 'You do not have permission to delete this file');
  }

  try {
    const resolvedPath = resolveUploadedPath(file.filePath);
    await fs.unlink(resolvedPath);
  } catch (e) {
    // continue even if physical delete fails
  }

  await uploadedFiles.deleteById(fileId);
  await taxPeriods.updateFileCount(file.periodId, -1);

  return { success: true };
}

module.exports = { uploadFiles, listFiles, deleteFile, ServiceError };

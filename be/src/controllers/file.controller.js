const databaseManager = require('../core/DatabaseManager');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

// Resolve stored upload path safely
const resolveUploadedPath = (p) => {
  try {
    if (!p) return p;
    return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  } catch {
    return p;
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const { periodId } = req.params;
    const uploadDir = path.join(__dirname, '../../uploads', periodId);

    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel files only
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// Upload files to a tax period
const uploadFiles = async (req, res) => {
  try {
    const { periodId } = req.params;
    // Handle both single file (req.file) and multiple files (req.files)
    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      return res.status(400).json({
        message: 'No files uploaded'
      });
    }

    const repositories = databaseManager.getRepositories();

    // Verify tax period exists
    const period = await repositories.taxPeriods.findById(periodId);
    if (!period) {
      return res.status(404).json({
        message: 'Tax period not found'
      });
    }

    // Create database records for uploaded files
    const fileRecords = [];
    for (const file of files) {
      const fileRecord = await repositories.uploadedFiles.create({
        periodId,
        fileName: file.originalname,
        filePath: file.path,
        uploadedBy: req.user.employeeCode,
        fileSize: file.size,
        contentType: file.mimetype
      });
      fileRecords.push(fileRecord);
    }

    // Update file count in period
    await repositories.taxPeriods.updateFileCount(periodId, files.length);

    res.status(201).json({
      message: `${files.length} file(s) uploaded successfully`,
      files: fileRecords.map(file => ({
        fileId: file.fileId,
        fileName: file.fileName,
        fileSize: file.fileSize,
        uploadedAt: file.uploadedAt
      }))
    });

  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({
      message: 'Error uploading files',
      error: error.message
    });
  }
};

// Get files for a tax period
const getFiles = async (req, res) => {
  try {
    const { periodId } = req.params;

    const repositories = databaseManager.getRepositories();
    const files = await repositories.uploadedFiles.findByPeriodId(periodId);

    const formattedFiles = files.map(file => ({
      fileId: file.fileId,
      fileName: file.fileName,
      fileSize: file.fileSize,
      uploadedBy: file.uploader ? file.uploader.fullName : 'Unknown',
      uploadedAt: file.uploadedAt,
      canDelete: req.user && (req.user.role === 'ADMIN' || file.uploadedBy === req.user.employeeCode)
    }));

    res.json(formattedFiles);

  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({
      message: 'Error fetching files'
    });
  }
};

// Delete a file
const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    const repositories = databaseManager.getRepositories();
    const file = await repositories.uploadedFiles.findWithRelations(fileId);

    if (!file) {
      return res.status(404).json({
        message: 'File not found'
      });
    }

    // Check permissions - only admin or uploader can delete
    if (req.user.role !== 'ADMIN' && file.uploadedBy !== req.user.employeeCode) {
      return res.status(403).json({
        message: 'You do not have permission to delete this file'
      });
    }

    // Delete physical file
    try {
      const resolvedPath = resolveUploadedPath(file.filePath);
      await fs.unlink(resolvedPath);
    } catch (physicalError) {
      console.warn('Could not delete physical file:', physicalError.message);
      // Continue with database deletion even if physical file deletion fails
    }

    // Delete database record
    await repositories.uploadedFiles.deleteById(fileId);

    // Update file count in period
    await repositories.taxPeriods.updateFileCount(file.periodId, -1);

    res.json({
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      message: 'Error deleting file'
    });
  }
};

module.exports = {
  // Export the multer instance for flexible usage
  multerUpload: upload,
  // Export configured middleware for multiple files
  uploadMultiple: upload.array('files', 10),
  // Export configured middleware for single file
  uploadSingle: upload.single('file'),
  // Export controller functions
  uploadFiles,
  getFiles,
  deleteFile
};

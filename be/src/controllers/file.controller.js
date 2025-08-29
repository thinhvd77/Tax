const path = require('path');
const multer = require('multer');
const { uploadFiles: uploadFilesService, listFiles: listFilesService, deleteFile: deleteFileService, ServiceError } = require('../services/file.service');

// Controller keeps storage config and validation; filenames are normalized in service

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const { periodId } = req.params;
    const uploadDir = path.join(__dirname, '../../uploads', periodId);

    try {
      const fsPromises = require('fs').promises;
      await fsPromises.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const original = file.originalname;
    const ext = path.extname(original);
    const name = path.basename(original, ext);
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

  const fileRecords = await uploadFilesService(periodId, files, req.user);

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
  const status = error instanceof ServiceError && error.status ? error.status : 500;
  res.status(status).json({ message: error.message || 'Error uploading files' });
  }
};

// Get files for a tax period
const getFiles = async (req, res) => {
  try {
    const { periodId } = req.params;

  const files = await listFilesService(periodId);

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
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Error fetching files' });
  }
};

// Delete a file
const deleteFile = async (req, res) => {
  try {
  const { fileId } = req.params;
  await deleteFileService(fileId, req.user);

    res.json({
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Error deleting file' });
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

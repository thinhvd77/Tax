const databaseManager = require('../core/DatabaseManager');
const path = require('path');
const fs = require('fs').promises;
const xlsx = require('xlsx');

// Helper function to get user identifier (IP address for now)
const getUserIdentifier = (req) => {
  return req.ip || req.connection.remoteAddress || 'unknown';
};

// Create new import session with month selection
const createSession = async (req, res) => {
  const { month, year } = req.body;

  if (!month || !year) {
    return res.status(400).json({
      message: 'Tháng và năm là bắt buộc'
    });
  }

  // Validate month format
  const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;

  if (monthStr > currentMonth) {
    return res.status(400).json({
      message: 'Không thể chọn tháng trong tương lai'
    });
  }

  try {
    const repositories = databaseManager.getRepositories();
    
    // Check if session already exists for this month/year
    const existingSession = await repositories.importSessions.findByMonthYear(month.toString(), year);
    if (existingSession && existingSession.length > 0) {
      return res.status(400).json({
        message: `Phiên import cho tháng ${month}/${year} đã tồn tại`
      });
    }

    const session = await repositories.importSessions.create({
      month: month.toString(),
      year: parseInt(year),
      created_by: getUserIdentifier(req),
      status: 'processing'
    });

    res.status(201).json({
      sessionId: session.id,
      month: session.month,
      year: session.year,
      status: session.status,
      message: `Đã tạo phiên import cho tháng ${month}/${year}`
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      message: 'Lỗi khi tạo phiên import'
    });
  }
};

// Get all sessions
const getAllSessions = async (req, res) => {
  try {
    const repositories = databaseManager.getRepositories();
    const sessions = await repositories.importSessions.findAll({
      relations: ['files'],
      order: { created_at: 'DESC' }
    });

    const formattedSessions = sessions.map(session => ({
      sessionId: session.id,
      month: session.month,
      year: session.year,
      status: session.status,
      fileCount: session.file_count || 0,
      createdAt: session.created_at,
      files: (session.files || []).map(file => ({
        id: file.id,
        originalFilename: file.original_filename,
        fileType: file.file_type,
        fileSize: file.file_size,
        uploadedAt: file.uploaded_at
      }))
    }));

    res.json(formattedSessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      message: 'Lỗi khi lấy danh sách phiên import'
    });
  }
};

// Get sessions by month/year
const getSessionsByMonth = async (req, res) => {
  try {
    const { month, year } = req.params;
    const repositories = databaseManager.getRepositories();

    const sessions = await repositories.importSessions.findByMonthYear(month, parseInt(year));

    const formattedSessions = sessions.map(session => ({
      sessionId: session.id,
      month: session.month,
      year: session.year,
      status: session.status,
      fileCount: session.file_count || 0,
      createdAt: session.created_at
    }));

    res.json(formattedSessions);
  } catch (error) {
    console.error('Error fetching sessions by month:', error);
    res.status(500).json({
      message: 'Lỗi khi lấy phiên import theo tháng'
    });
  }
};

// Get specific session
const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const repositories = databaseManager.getRepositories();

    const session = await repositories.importSessions.findWithFiles(parseInt(sessionId));

    if (!session) {
      return res.status(404).json({
        message: 'Không tìm thấy phiên import'
      });
    }

    const formattedSession = {
      sessionId: session.id,
      month: session.month,
      year: session.year,
      status: session.status,
      fileCount: session.file_count || 0,
      createdAt: session.created_at,
      resultFilePath: session.result_file_path,
      files: (session.files || []).map(file => ({
        id: file.id,
        originalFilename: file.original_filename,
        fileType: file.file_type,
        fileSize: file.file_size,
        uploadedAt: file.uploaded_at
      }))
    };

    res.json(formattedSession);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      message: 'Lỗi khi lấy thông tin phiên import'
    });
  }
};

// Download result file
const downloadResult = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const repositories = databaseManager.getRepositories();
    const session = await repositories.importSessions.findById(parseInt(sessionId));

    if (!session || !session.result_file_path) {
      return res.status(404).json({
        message: 'Không tìm thấy file kết quả'
      });
    }

    const filePath = path.join(__dirname, '../../', session.result_file_path);

    // Check if file exists
    try {
      await fs.access(filePath);
      res.download(filePath, `Bang_luong_${session.month}.xlsx`);
    } catch (fileError) {
      res.status(404).json({
        message: 'File kết quả không tồn tại'
      });
    }
  } catch (error) {
    console.error('Error downloading result:', error);
    res.status(500).json({
      message: 'Lỗi khi tải file kết quả'
    });
  }
};

// Delete import session
const deleteSession = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const repositories = databaseManager.getRepositories();
    const session = await repositories.importSessions.findById(parseInt(sessionId));

    if (!session) {
      return res.status(404).json({
        message: 'Không tìm thấy phiên import'
      });
    }

    // Delete associated files
    await repositories.importedFiles.deleteBySessionId(parseInt(sessionId));

    // Delete result file if exists
    if (session.result_file_path) {
      try {
        const filePath = path.join(__dirname, '../../', session.result_file_path);
        await fs.unlink(filePath);
      } catch (fileError) {
        console.error('Error deleting result file:', fileError);
      }
    }

    // Delete session directory
    try {
      const uploadDir = path.join(__dirname, '../../uploads', session.year.toString(), session.month.split('-')[1], sessionId.toString());
      await fs.rmdir(uploadDir, { recursive: true });
    } catch (dirError) {
      console.error('Error deleting upload directory:', dirError);
    }

    // Delete session
    await repositories.importSessions.deleteById(parseInt(sessionId));

    res.json({
      message: 'Phiên import đã được xóa thành công'
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      message: 'Lỗi khi xóa phiên import'
    });
  }
};

// Preview processed data before download
const previewSessionData = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const repositories = databaseManager.getRepositories();
    const session = await repositories.importSessions.findWithFiles(parseInt(sessionId));

    if (!session) {
      return res.status(404).json({
        message: 'Không tìm thấy phiên import'
      });
    }

    if (session.status !== 'completed') {
      return res.status(400).json({
        message: 'Phiên import chưa hoàn thành. Không thể xem trước.'
      });
    }

    // Read the result file if it exists
    if (!session.result_file_path) {
      return res.status(404).json({
        message: 'Không tìm thấy dữ liệu để xem trước'
      });
    }

    const filePath = path.join(__dirname, '../../', session.result_file_path);

    try {
      const workbook = xlsx.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(worksheet);

      // Show all data instead of limiting to 50 rows
      const previewData = data;

      res.json({
        sessionId: session.id,
        month: session.month,
        totalRows: data.length,
        previewRows: previewData.length,
        data: previewData,
        summary: {
          totalEmployees: data.filter(row => typeof row['STT'] === 'number').length,
          totalTax: data.reduce((sum, row) => sum + (row['TỔNG THUẾ TNCN TẠM TÍNH'] || 0), 0),
          totalSalary: data.reduce((sum, row) => sum + (row['LƯƠNG V1'] || 0), 0)
        },
        columns: data.length > 0 ? Object.keys(data[0]) : []
      });
    } catch (fileError) {
      res.status(404).json({
        message: 'Không thể đọc file kết quả'
      });
    }
  } catch (error) {
    console.error('Error previewing session data:', error);
    res.status(500).json({
      message: 'Lỗi khi xem trước dữ liệu'
    });
  }
};

module.exports = {
  createSession,
  getAllSessions,
  getSessionsByMonth,
  getSession,
  downloadResult,
  deleteSession,
  previewSessionData
};

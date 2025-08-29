const {
  createSession: createSessionService,
  listSessions,
  listSessionsByMonth,
  getSession: getSessionService,
  downloadResult: downloadResultService,
  deleteSession: deleteSessionService,
  previewSaved,
  ServiceError
} = require('../services/session.service');

// Helper function to get user identifier (IP address for now)
const getUserIdentifier = (req) => {
  return req.ip || req.connection.remoteAddress || 'unknown';
};

// Create new import session with month selection
const createSession = async (req, res) => {
  const { month, year } = req.body;
  try {
    const session = await createSessionService({ month, year }, req);
    res.status(201).json({
      sessionId: session.id,
      month: session.month,
      year: session.year,
      status: session.status,
      message: `Đã tạo phiên import cho tháng ${month}/${year}`
    });
  } catch (error) {
    console.error('Error creating session:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Lỗi khi tạo phiên import' });
  }
};

// Get all sessions
const getAllSessions = async (req, res) => {
  try {
    const sessions = await listSessions();
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
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Lỗi khi lấy danh sách phiên import' });
  }
};

// Get sessions by month/year
const getSessionsByMonth = async (req, res) => {
  try {
    const { month, year } = req.params;
    const sessions = await listSessionsByMonth(month, parseInt(year));
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
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Lỗi khi lấy phiên import theo tháng' });
  }
};

// Get specific session
const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await getSessionService(sessionId);
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
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Lỗi khi lấy thông tin phiên import' });
  }
};

// Download result file
const downloadResult = async (req, res) => {
  const { sessionId } = req.params;
  try {
    const { filePath, filename } = await downloadResultService(sessionId);
    res.download(filePath, filename);
  } catch (error) {
    console.error('Error downloading result:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Lỗi khi tải file kết quả' });
  }
};

// Delete import session
const deleteSession = async (req, res) => {
  const { sessionId } = req.params;
  try {
    await deleteSessionService(sessionId);
    res.json({ message: 'Phiên import đã được xóa thành công' });
  } catch (error) {
    console.error('Error deleting session:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Lỗi khi xóa phiên import' });
  }
};

// Preview processed data before download
const previewSessionData = async (req, res) => {
  const { sessionId } = req.params;
  try {
    const result = await previewSaved(sessionId);
    res.json(result);
  } catch (error) {
    console.error('Error previewing session data:', error);
    const status = error instanceof ServiceError && error.status ? error.status : 500;
    res.status(status).json({ message: error.message || 'Lỗi khi xem trước dữ liệu' });
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

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

function getUserIdentifierFromReq(req) {
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

async function createSession({ month, year }, req) {
  if (!month || !year) throw new ServiceError(400, 'Tháng và năm là bắt buộc');

  const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  if (monthStr > currentMonth) throw new ServiceError(400, 'Không thể chọn tháng trong tương lai');

  const { importSessions } = getRepos();
  const existing = await importSessions.findByMonthYear(month.toString(), parseInt(year));
  if (existing && existing.length > 0) {
    throw new ServiceError(400, `Phiên import cho tháng ${month}/${year} đã tồn tại`);
  }

  const session = await importSessions.create({
    month: month.toString(),
    year: parseInt(year),
    created_by: getUserIdentifierFromReq(req),
    status: 'processing'
  });

  return session;
}

async function listSessions() {
  const { importSessions } = getRepos();
  return importSessions.findAll({ relations: ['files'], order: { created_at: 'DESC' } });
}

async function listSessionsByMonth(month, year) {
  const { importSessions } = getRepos();
  return importSessions.findByMonthYear(month, parseInt(year));
}

async function getSession(sessionId) {
  const { importSessions } = getRepos();
  const session = await importSessions.findWithFiles(parseInt(sessionId));
  if (!session) throw new ServiceError(404, 'Không tìm thấy phiên import');
  return session;
}

async function downloadResult(sessionId) {
  const { importSessions } = getRepos();
  const session = await importSessions.findById(parseInt(sessionId));
  if (!session || !session.result_file_path) throw new ServiceError(404, 'Không tìm thấy file kết quả');
  const filePath = path.join(__dirname, '../../', session.result_file_path);
  await fs.access(filePath); // throws if not exists
  return { filePath, filename: `Bang_luong_${session.month}.xlsx` };
}

async function deleteSession(sessionId) {
  const { importSessions, importedFiles } = getRepos();
  const session = await importSessions.findById(parseInt(sessionId));
  if (!session) throw new ServiceError(404, 'Không tìm thấy phiên import');

  await importedFiles.deleteBySessionId(parseInt(sessionId));
  if (session.result_file_path) {
    try {
      const filePath = path.join(__dirname, '../../', session.result_file_path);
      await fs.unlink(filePath);
    } catch {}
  }

  try {
    const uploadDir = path.join(__dirname, '../../uploads', session.year.toString(), session.month.split('-')[1], sessionId.toString());
    await fs.rm(uploadDir, { recursive: true, force: true });
  } catch {}

  await importSessions.deleteById(parseInt(sessionId));
  return { success: true };
}

async function previewSaved(sessionId) {
  const { importSessions } = getRepos();
  const session = await importSessions.findWithFiles(parseInt(sessionId));
  if (!session) throw new ServiceError(404, 'Không tìm thấy phiên import');
  if (session.status !== 'completed') throw new ServiceError(400, 'Phiên import chưa hoàn thành. Không thể xem trước.');
  if (!session.result_file_path) throw new ServiceError(404, 'Không tìm thấy dữ liệu để xem trước');

  const filePath = path.join(__dirname, '../../', session.result_file_path);
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(worksheet);
  const previewData = data;
  return {
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
  };
}

module.exports = {
  createSession,
  listSessions,
  listSessionsByMonth,
  getSession,
  downloadResult,
  deleteSession,
  previewSaved,
  ServiceError
};

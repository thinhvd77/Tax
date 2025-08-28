// Filename: server/src/controllers/payroll.controller.js

const { ServiceError, generatePayrollFileForSession, previewPayrollForSession, updatePayrollReport, calculatePayrollToBuffer } = require('../services/pit.service');

// Enhanced controller for session-based import
const calculatePayrollWithSession = async (req, res) => {
    const { sessionId } = req.params;
    const files = req.files;
    try {
        const { buffer, filename } = await generatePayrollFileForSession(sessionId, files);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error('Lỗi hệ thống khi xử lý file:', error);
        const status = error instanceof ServiceError && error.status ? error.status : 500;
        res.status(status).json({ message: error.message || 'Lỗi hệ thống khi xử lý file.' });
    }
};

// Preview processed data without saving to file
const previewPayrollWithSession = async (req, res) => {
    const { sessionId } = req.params;
    const files = req.files;
    try {
        const result = await previewPayrollForSession(sessionId, files);
        res.json(result);
    } catch (error) {
        console.error('Lỗi hệ thống khi xem trước file:', error);
        const status = error instanceof ServiceError && error.status ? error.status : 500;
        res.status(status).json({ message: error.message || 'Lỗi hệ thống khi xem trước file.' });
    }
};

// CONTROLLER cho luồng CẬP NHẬT
const updatePayrollController = async (req, res) => {
    const existingReportFile = req.files.existingReport ? req.files.existingReport[0] : null;
    const newBonusFile = req.files.newBonusFile ? req.files.newBonusFile[0] : null;
    const newBonusTitle = req.body.newBonusTitle || 'Thưởng bổ sung';

    if (!existingReportFile || !newBonusFile) {
        return res.status(400).json({ message: 'Vui lòng tải lên đủ cả file kết quả cũ và file thưởng mới.' });
    }

    try {
        const { buffer, filename } = updatePayrollReport(existingReportFile.buffer, newBonusFile.buffer, newBonusTitle);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Lỗi hệ thống khi cập nhật file:', error);
        const status = error instanceof ServiceError && error.status ? error.status : 500;
        res.status(status).json({ message: error.message || 'Lỗi hệ thống khi cập nhật file.' });
    }
};

// Original controller for backward compatibility
const calculatePayrollController = async (req, res) => {
    const files = req.files;
    try {
        const { buffer, filename, contentType } = calculatePayrollToBuffer(files);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', contentType);
        res.send(buffer);
    } catch (error) {
        console.error('Lỗi hệ thống khi xử lý file:', error);
        const status = error instanceof ServiceError && error.status ? error.status : 500;
        res.status(status).json({ message: error.message || 'Lỗi hệ thống khi xử lý file.' });
    }
};

module.exports = { calculatePayrollController, updatePayrollController, calculatePayrollWithSession, previewPayrollWithSession };

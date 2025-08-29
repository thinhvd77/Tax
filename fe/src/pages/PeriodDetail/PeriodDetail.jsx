import React, {useState, useEffect} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {useAuth} from '../../contexts/AuthContext';
import api from '../../lib/api';
import './PeriodDetail.css';
import Toast from '../../components/Toast';

const PeriodDetail = () => {
    const {periodId} = useParams();
    const navigate = useNavigate();
    const {user, isReviewer, isAdmin} = useAuth();

    const [period, setPeriod] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [toast, setToast] = useState({show: false, message: '', type: 'info'});
    const [confirmDialog, setConfirmDialog] = useState({show: false, message: '', onConfirm: null});

    useEffect(() => {
        fetchPeriod();
    }, [periodId]);

    const showToast = (message, type = 'info') => setToast({show: true, message, type});

    const fetchPeriod = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/periods/${periodId}`);
            setPeriod(response.data);
            setError('');
        } catch (err) {
            console.error('Error fetching period:', err);
            setError('Failed to load tax period details');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (!files || files.length === 0) return;

        // Validate file types
        const invalidFiles = files.filter(file => !file.name.match(/\.(xlsx|xls)$/i));
        if (invalidFiles.length > 0) {
            showToast(`Please select only Excel files (.xlsx or .xls). Invalid files: ${invalidFiles.map(f => f.name).join(', ')}`, 'error');
            return;
        }

        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        try {
            setUploading(true);
            const response = await api.post(`/api/periods/${periodId}/files`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Refresh period data
            await fetchPeriod();

            // Clear file input
            event.target.value = '';

            const fileCount = files.length;
            showToast(`${fileCount} file${fileCount > 1 ? 's' : ''} uploaded successfully!`, 'success');
        } catch (err) {
            console.error('Error uploading files:', err);
            showToast(err.response?.data?.message || 'Failed to upload files', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteFile = async (fileId) => {
        setConfirmDialog({
            show: true,
            message: 'Are you sure you want to delete this file?',
            onConfirm: async () => {
                try {
                    await api.delete(`/api/files/${fileId}`);
                    await fetchPeriod();
                    showToast('File deleted successfully!', 'success');
                } catch (err) {
                    console.error('Error deleting file:', err);
                    showToast(err.response?.data?.message || 'Failed to delete file', 'error');
                }
            }
        });
    };

    const handleConsolidatePreview = async () => {
        try {
            setProcessing(true);
            const response = await api.post(`/api/periods/${periodId}/preview`);
            setPreviewData(response.data);

            // Debug: Log column detection
            if (response.data.columns) {
                console.log('All columns:', response.data.columns);
                console.log('Sample row data:', response.data.data[0]);
                // Determine which columns are treated as currency (debug only)
                const currencyColumns = response.data.columns.filter(col => {
                    const upperCol = col.toUpperCase();
                    const isExcluded = ['STT', 'HỌ VÀ TÊN', 'CHỨC VỤ', 'NAME', 'POSITION', 'ID']
                            .some(excluded => upperCol === excluded || upperCol.includes(excluded))
                        || (upperCol.includes('SL') && upperCol.includes('PHỤ THUỘC'));
                    return !isExcluded;
                });
                console.log('Columns that will be formatted as currency:', currencyColumns);
            }

            setShowPreview(true);
            await fetchPeriod(); // Refresh to get updated status
        } catch (err) {
            console.error('Error consolidating data:', err);
            showToast(err.response?.data?.message || 'Failed to consolidate data', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleExportReport = async () => {
        try {
            const response = await api.get(`/api/periods/${periodId}/export`, {
                responseType: 'blob'
            });

            // Create download link
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Tax_Report_${period.name.replace(/\s+/g, '_')}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            await fetchPeriod(); // Refresh to get updated status
        } catch (err) {
            console.error('Error exporting report:', err);
            showToast(err.response?.data?.message || 'Failed to export report', 'error');
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        try {
            await api.put(`/api/periods/${periodId}/status`, {status: newStatus});
            await fetchPeriod();
        } catch (err) {
            console.error('Error updating status:', err);
            showToast(err.response?.data?.message || 'Failed to update status', 'error');
        }
    };
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatCurrency = (value) => {
        if (value === null || value === undefined || isNaN(value)) {
            return '0';
        }

        return new Intl.NumberFormat('vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };
    if (loading) {
        return (
            <div className="period-detail-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading period details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="period-detail-container">
                <div className="error-state">
                    <h2>Error Loading Period</h2>
                    <p>{error}</p>
                    <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="period-detail-container">
            <Toast show={toast.show} message={toast.message} type={toast.type}
                   onClose={() => setToast(prev => ({...prev, show: false}))}/>

            {/* Confirmation Dialog */}
            {confirmDialog.show && (
                <div className="confirmation-dialog-overlay"
                     onClick={() => setConfirmDialog({show: false, message: '', onConfirm: null})}>
                    <div className="confirmation-dialog" onClick={e => e.stopPropagation()}>
                        <div className="confirmation-content">
                            <h3>Confirm Action</h3>
                            <p>{confirmDialog.message}</p>
                            <div className="confirmation-buttons">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setConfirmDialog({show: false, message: '', onConfirm: null})}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => {
                                        if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                                        setConfirmDialog({show: false, message: '', onConfirm: null});
                                    }}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="period-header">
                <div className="header-content">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="back-button"
                    >
                        ← Back to Dashboard
                    </button>
                    <div className="period-info">
                        <h1>{period.name}</h1>
                        <div className="period-meta">
              <span className={`status-badge status-${period.status.toLowerCase().replace('_', '-')}`}>
                {period.status.replace('_', ' ')}
              </span>
                            <span className="created-info">
                Created by {period.createdBy} on {new Date(period.createdAt).toLocaleDateString()}
              </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="period-content">
                {/* File Upload Section */}
                <div className="section">
                    <div className="section-header">
                        <h2>File Upload</h2>
                    </div>

                    {period.status === 'IN_PROGRESS' ? (
                        <div className="upload-area">
                            <div className="upload-dropzone">
                                <div className="upload-icon">📁</div>
                                <h3>Drag and drop Excel files here</h3>
                                <p>or click to browse for files</p>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                    className="file-input"
                                    multiple
                                />
                                {uploading && (
                                    <div className="upload-progress">
                                        <div className="spinner small"></div>
                                        <span>Uploading...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="upload-disabled">
                            <p>File upload is disabled. Period status: {period.status}</p>
                        </div>
                    )}
                </div>

                {/* Files List */}
                <div className="section">
                    <div className="section-header">
                        <h2>Uploaded Files ({period.files.length})</h2>
                    </div>

                    {period.files.length === 0 ? (
                        <div className="empty-files">
                            <p>No files uploaded yet</p>
                        </div>
                    ) : (
                        <div className="files-table">
                            <table>
                                <thead>
                                <tr>
                                    <th>File Name</th>
                                    <th>Size</th>
                                    <th>Uploaded By</th>
                                    <th>Upload Date</th>
                                    <th>Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {period.files.map(file => (
                                    <tr key={file.fileId}>
                                        <td>
                                            <div className="file-name">
                          <span className="file-icon"><span className="file-icon">
                                                      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"
                                                           viewBox="0 0 640 640" fill="green">
                                                          <path
                                                              d="M128 128C128 92.7 156.7 64 192 64L341.5 64C358.5 64 374.8 70.7 386.8 82.7L493.3 189.3C505.3 201.3 512 217.6 512 234.6L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 128zM336 122.5L336 216C336 229.3 346.7 240 360 240L453.5 240L336 122.5zM292 330.7C284.6 319.7 269.7 316.7 258.7 324C247.7 331.3 244.7 346.3 252 357.3L291.2 416L252 474.7C244.6 485.7 247.6 500.6 258.7 508C269.8 515.4 284.6 512.4 292 501.3L320 459.3L348 501.3C355.4 512.3 370.3 515.3 381.3 508C392.3 500.7 395.3 485.7 388 474.7L348.8 416L388 357.3C395.4 346.3 392.4 331.4 381.3 324C370.2 316.6 355.4 319.6 348 330.7L320 372.7L292 330.7z"/></svg>
                                                    </span></span>
                                                {file.fileName}
                                            </div>
                                        </td>
                                        <td>{formatFileSize(file.fileSize)}</td>
                                        <td>{file.uploadedBy}</td>
                                        <td>{new Date(file.uploadedAt).toLocaleDateString()}</td>
                                        <td>
                                            {file.canDelete && (
                                                <button
                                                    onClick={() => handleDeleteFile(file.fileId)}
                                                    className="btn btn-danger btn-small"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Preview Section - Available for all authenticated users */}
                <div className="section">
                    <div className="section-header">
                        <h2>Data Processing</h2>
                        <p>Process uploaded files and preview tax calculations</p>
                    </div>

                    <div className="actions-panel">
                        <div className="action-card">
                            <h3>Consolidate & Preview Results</h3>
                            <p>Process all uploaded files and preview tax calculations</p>
                            <button
                                onClick={handleConsolidatePreview}
                                disabled={period.files.length === 0 || processing}
                                className="btn btn-primary"
                            >
                                {processing ? 'Processing...' : 'Consolidate & Preview'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Reviewer Actions Section - Only for Reviewers */}
                {isReviewer && (
                    <div className="section">
                        <div className="section-header">
                            <h2>Reviewer Actions</h2>
                            <p>Export reports and manage period status</p>
                        </div>

                        <div className="actions-panel">
                            <div className="action-card">
                                <h3>Export Final Report</h3>
                                <p>Download the consolidated tax calculation report</p>
                                <button
                                    onClick={handleExportReport}
                                    disabled={period.status !== 'COMPLETED'}
                                    className="btn btn-success"
                                >
                                    Export Excel Report
                                </button>
                            </div>

                            <div className="action-card">
                                <h3>Status Management</h3>
                                <p>Update the period status</p>
                                <div className="status-buttons">
                                    <button
                                        onClick={() => handleUpdateStatus('IN_PROGRESS')}
                                        disabled={period.status === 'IN_PROGRESS'}
                                        className="btn btn-secondary btn-small"
                                    >
                                        Mark In Progress
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus('COMPLETED')}
                                        disabled={period.status === 'COMPLETED'}
                                        className="btn btn-success btn-small"
                                    >
                                        Mark Completed
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {showPreview && previewData && (
                <div className="preview-modal-overlay" onClick={() => setShowPreview(false)}>
                    <div className="preview-modal" onClick={e => e.stopPropagation()}>
                        <div className="preview-modal-header">
                            <h2>Tax Calculation Preview</h2>
                            <button
                                className="modal-close"
                                onClick={() => setShowPreview(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="preview-modal-content">
                            <div className="preview-summary">
                                <h3>Summary</h3>
                                <div className="summary-grid">
                                    <div className="summary-item">
                                        <span className="label">Total Employees:</span>
                                        <span className="value">{previewData.summary.totalEmployees}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="label">Total Income:</span>
                                        <span className="value">{formatCurrency(previewData.summary.totalIncome)}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="label">Total Tax:</span>
                                        <span className="value">{formatCurrency(previewData.summary.totalTax)}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="label">Total Records:</span>
                                        <span className="value">{previewData.data.length}</span>
                                    </div>
                                </div>
                            </div>

                            {!isReviewer && (
                                <div className="preview-info-note">
                                    <p><strong>Note:</strong> As an Uploader, you can preview the tax calculations but
                                        cannot export or finalize reports. Contact a Reviewer to export the final
                                        report.</p>
                                </div>
                            )}

                            <div className="preview-table">
                                <table>
                                    <thead>
                                    <tr>
                                        {previewData.columns.map(col => (
                                            <th key={col}>{col}</th>
                                        ))}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {previewData.data.map((row, index) => (
                                        <tr key={index}>
                                            {previewData.columns.map(col => (
                                                <td key={col}>
                                                    {(() => {
                                                        const value = row[col];

                                                        // Check if this is a non-currency column first
                                                        const upperColumnName = col.toUpperCase();
                                                        const isNonCurrencyColumn = [
                                                            'STT', 'HỌ VÀ TÊN', 'CHỨC VỤ', 'NAME', 'POSITION', 'ID'
                                                        ].some(excluded =>
                                                            upperColumnName === excluded || upperColumnName.includes(excluded)
                                                        );

                                                        // Special case for "NGƯỜI PHỤ THUỘC SL" - this is a count, not currency
                                                        const isCountColumn = upperColumnName.includes('SL') && upperColumnName.includes('PHỤ THUỘC');

                                                        // If it's a non-currency column or count column, return as-is
                                                        if (isNonCurrencyColumn || isCountColumn) {
                                                            return value || '';
                                                        }

                                                        // For all other columns, try to format as currency if it's numeric
                                                        if (value !== null && value !== undefined && value !== '') {
                                                            // Convert string numbers to actual numbers if needed
                                                            let numValue = value;
                                                            if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                                                                numValue = parseFloat(value);
                                                            }

                                                            // If it's a number, format as currency
                                                            if (typeof numValue === 'number' && !isNaN(numValue)) {
                                                                return formatCurrency(numValue);
                                                            }
                                                        }

                                                        // Return as-is for non-numeric values
                                                        return value || '';
                                                    })()}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="preview-note">
                                Showing all {previewData.data.length} records
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PeriodDetail;

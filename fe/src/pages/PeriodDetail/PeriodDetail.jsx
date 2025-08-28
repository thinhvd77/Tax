import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import './PeriodDetail.css';

const PeriodDetail = () => {
  const { periodId } = useParams();
  const navigate = useNavigate();
  const { user, isReviewer } = useAuth();

  const [period, setPeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    fetchPeriod();
  }, [periodId]);

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
      alert(`Please select only Excel files (.xlsx or .xls). Invalid files: ${invalidFiles.map(f => f.name).join(', ')}`);
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
      alert(`${fileCount} file${fileCount > 1 ? 's' : ''} uploaded successfully!`);
    } catch (err) {
      console.error('Error uploading files:', err);
      alert(err.response?.data?.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await api.delete(`/api/files/${fileId}`);
      await fetchPeriod();
      alert('File deleted successfully!');
    } catch (err) {
      console.error('Error deleting file:', err);
      alert(err.response?.data?.message || 'Failed to delete file');
    }
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
      alert(err.response?.data?.message || 'Failed to consolidate data');
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
      alert(err.response?.data?.message || 'Failed to export report');
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await api.put(`/api/periods/${periodId}/status`, { status: newStatus });
      await fetchPeriod();
    } catch (err) {
      console.error('Error updating status:', err);
      alert(err.response?.data?.message || 'Failed to update status');
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

  const isCurrencyColumn = (columnName) => {
    // Convert to uppercase for case-insensitive comparison
    const upperColumnName = columnName.toUpperCase();
    
    // Exclude specific non-currency columns first
    const excludedPatterns = [
      'STT', 'HỌ VÀ TÊN', 'CHỨC VỤ', 'NAME', 'POSITION', 'ID',
      'NGƯỜI PHỤ THUỘC SL', 'SL', 'SỐ LƯỢNG', 'COUNT', 'NUMBER'
    ];
    
    const isExcluded = excludedPatterns.some(excluded => {
      if (excluded === 'STT' && upperColumnName === 'STT') return true;
      if (excluded === 'SL' && upperColumnName.endsWith('SL') && upperColumnName.includes('PHỤ THUỘC')) return true;
      return upperColumnName === excluded || upperColumnName.includes(excluded);
    });
    
    if (isExcluded) return false;
    
    // For tax/payroll data, assume most numeric columns are currency
    // This is a more inclusive approach since Vietnamese payroll data
    // typically consists of mostly monetary values
    const currencyPatterns = [
      // Standard tax calculation columns
      'LƯƠNG', 'THUẾ', 'THU NHẬP', 'GIẢM TRỪ', 'TỔNG', 'SỐ TIỀN',
      'BHXH', 'BHYT', 'BHTN', 'ĐHKQ', 'CHI TIỀN', 'THƯỞNG',
      'V1', 'V2', 'HỘI NGHỊ', 'NGHỈ MÁT', 'SINH NHẬT',
      'KIỂM TRA', 'CHUYÊN MÔN', 'PHỤ CẤP', 'TRỢ CẤP',
      
      // Additional Vietnamese terms from the data
      'HUY ĐỘNG', 'VỐN', 'TRUY LĨNH', 'NĂNG LƯỢNG', 'BH',
      'BONUS', 'ALLOWANCE', 'OVERTIME', 'COMMISSION',
      
      // Any column that contains money-related terms
      'TIỀN', 'ĐỒNG', 'MONEY', 'AMOUNT', 'FUND', 'PAY',
      'COMPENSATION', 'BENEFIT', 'INCENTIVE', 'REWARD',
      
      // English patterns
      'INCOME', 'TAX', 'SALARY', 'BONUS', 'ALLOWANCE'
    ];
    
    // Check if column name contains any currency keywords
    return currencyPatterns.some(pattern => 
      upperColumnName.includes(pattern)
    );
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
            <p>Upload Excel files containing employee payroll data</p>
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
                          <span className="file-icon">📄</span>
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
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="preview-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tax Calculation Preview</h2>
              <button 
                className="modal-close"
                onClick={() => setShowPreview(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-content">
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
                  <p><strong>Note:</strong> As an Uploader, you can preview the tax calculations but cannot export or finalize reports. Contact a Reviewer to export the final report.</p>
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
                <p className="preview-note">
                  Showing all {previewData.data.length} records
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowPreview(false)}
              >
                Close
              </button>
              {isReviewer && (
                <button 
                  className="btn btn-success"
                  onClick={handleExportReport}
                >
                  Export Full Report
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeriodDetail;

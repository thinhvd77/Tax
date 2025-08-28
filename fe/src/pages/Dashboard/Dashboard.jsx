import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import './Dashboard.css';

const Dashboard = () => {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState('');
  const [creating, setCreating] = useState(false);
  
  const { user, isReviewer, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/periods');
      setPeriods(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching periods:', err);
      setError('Failed to load tax periods');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    if (!newPeriodName.trim()) return;

    try {
      setCreating(true);
      const response = await api.post('/api/periods', {
        name: newPeriodName.trim()
      });
      
      setPeriods(prev => [response.data, ...prev]);
      setShowCreateModal(false);
      setNewPeriodName('');
    } catch (err) {
      console.error('Error creating period:', err);
      alert(err.response?.data?.message || 'Failed to create tax period');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'IN_PROGRESS': { text: 'In Progress', class: 'status-in-progress' },
      'READY_FOR_REVIEW': { text: 'Ready for Review', class: 'status-ready' },
      'COMPLETED': { text: 'Completed', class: 'status-completed' }
    };
    
    const config = statusConfig[status] || { text: status, class: 'status-unknown' };
    
    return (
      <span className={`status-badge ${config.class}`}>
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading tax periods...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Tax Period Dashboard</h1>
          <p>Manage payroll tax calculation periods</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <span className="btn-icon">+</span>
          Create New Tax Period
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          {error}
          <button onClick={fetchPeriods} className="retry-btn">Retry</button>
        </div>
      )}

      <div className="periods-grid">
        {periods.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No Tax Periods Yet</h3>
            <p>Create your first tax period to start managing payroll calculations.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              Create Tax Period
            </button>
          </div>
        ) : (
          periods.map(period => (
            <div 
              key={period.periodId} 
              className="period-card"
              onClick={() => navigate(`/periods/${period.periodId}`)}
            >
              <div className="period-header">
                <h3>{period.name}</h3>
                {getStatusBadge(period.status)}
              </div>
              
              <div className="period-stats">
                <div className="stat">
                  <span className="stat-label">Files</span>
                  <span className="stat-value">{period.numberOfFiles}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Created by</span>
                  <span className="stat-value">{period.createdBy}</span>
                </div>
              </div>

              <div className="period-dates">
                <div className="date-info">
                  <span className="date-label">Created:</span>
                  <span className="date-value">{formatDate(period.createdAt)}</span>
                </div>
                <div className="date-info">
                  <span className="date-label">Updated:</span>
                  <span className="date-value">{formatDate(period.lastUpdated)}</span>
                </div>
              </div>

              <div className="period-actions">
                <span className="action-hint">Click to view details →</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Period Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Tax Period</h2>
              <button 
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreatePeriod} className="modal-content">
              <div className="form-group">
                <label htmlFor="periodName">Period Name</label>
                <input
                  id="periodName"
                  type="text"
                  value={newPeriodName}
                  onChange={(e) => setNewPeriodName(e.target.value)}
                  placeholder="e.g., September 2025"
                  disabled={creating}
                  autoFocus
                />
                <small>Enter a descriptive name for this tax period</small>
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating || !newPeriodName.trim()}
                >
                  {creating ? 'Creating...' : 'Create Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

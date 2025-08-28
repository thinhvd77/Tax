import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import logoUrl from '../../asset/logo.png';
import './Login.css';

const Login = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !password) {
      setError('Please enter both User ID and password');
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(userId, password);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const demoAccounts = [
    { userId: 'uploader1', password: 'password123', role: 'Uploader' },
    { userId: 'reviewer1', password: 'password123', role: 'Reviewer' },
    { userId: 'admin1', password: 'admin123', role: 'Admin' }
  ];

  const fillDemo = (account) => {
    setUserId(account.userId);
    setPassword(account.password);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={logoUrl} alt="Payroll Pro" className="login-logo" />
          <h1>Payroll Pro</h1>
          <p>Bank Tax Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group-login">
            <label htmlFor="userId">User ID</label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter your User ID"
              disabled={loading}
            />
          </div>

          <div className="form-group-login">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

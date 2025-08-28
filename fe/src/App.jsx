// client/src/App.jsx
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import PeriodDetail from './pages/PeriodDetail/PeriodDetail';
import UserManagement from './pages/UserManagement/UserManagement';


import logoUrl from './asset/logo.png';
import './App.css';

function Layout({ children }) {
  const [theme, setTheme] = useState('light');
  const { user, logout } = useAuth();

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = stored || (prefersDark ? 'dark' : 'light');
    setTheme(initial);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-brand">
            <img src={logoUrl} alt="Payroll Pro logo" className="app-logo" />
            <h1 className="app-title">Payroll Pro <span className="badge">Enterprise</span></h1>
          </div>
          <nav className="app-nav">
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Dashboard
            </NavLink>
            {user?.role === 'ADMIN' && (
              <NavLink to="/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                User Management
              </NavLink>
            )}
            <div className="user-menu">
              <span className="user-info">
                <span className="user-name">{user?.name}</span>
                <span className="user-role">{user?.role}</span>
              </span>
              <button className="nav-toggle" onClick={toggleTheme} aria-label="Toggle theme">
                {theme === 'dark' ? '🌙' : '🌞'}
              </button>
              <button className="logout-btn" onClick={logout}>
                Logout
              </button>
            </div>
          </nav>
        </div>
      </header>
      <main className="app-main">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" /> : <Login />} 
      />
      
      <Route path="/dashboard" element={
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      } />
        <Route path="/users" element={
          <PrivateRoute>
            <UserManagement />
          </PrivateRoute>
        } />
      
      <Route path="/periods/:periodId" element={
        <PrivateRoute>
          <PeriodDetail />
        </PrivateRoute>
      } />
      
      {/* Default redirects */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

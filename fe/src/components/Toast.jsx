import React, { useEffect } from 'react';

const baseStyle = {
  container: {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  toast: {
    minWidth: '280px',
    maxWidth: '420px',
    padding: '12px 14px',
    borderRadius: '8px',
    color: '#0b2314',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    fontSize: '14px',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    fontSize: '18px',
    cursor: 'pointer',
    marginLeft: '8px',
    lineHeight: 1,
  },
  icon: {
    fontSize: '18px',
    marginTop: '1px',
  },
};

const typeStyles = {
  success: { background: '#dcfce7', border: '1px solid #86efac' },
  error: { background: '#fee2e2', border: '1px solid #fca5a5' },
  info: { background: '#e0f2fe', border: '1px solid #93c5fd' },
};

const typeIcon = {
  success: '✔️',
  error: '⚠️',
  info: 'ℹ️',
};

// Toast component supports single message display.
// Props: show, message, type ('success' | 'error' | 'info'), duration (ms), onClose
export default function Toast({ show, message, type = 'info', duration = 3000, onClose }) {
  useEffect(() => {
    if (!show) return;
    const id = setTimeout(() => {
      onClose && onClose();
    }, duration);
    return () => clearTimeout(id);
  }, [show, duration, onClose]);

  if (!show || !message) return null;

  const toastStyle = { ...baseStyle.toast, ...(typeStyles[type] || typeStyles.info) };

  return (
    <div style={baseStyle.container} aria-live="polite" aria-atomic="true">
      <div style={toastStyle} role="status">
        <span style={baseStyle.icon} aria-hidden="true">{typeIcon[type] || typeIcon.info}</span>
        <div style={{ flex: 1 }}>{message}</div>
        <button type="button" aria-label="Close notification" style={baseStyle.closeBtn} onClick={onClose}>×</button>
      </div>
    </div>
  );
}

/**
 * Session Expiry Notice Component
 * Shows countdown and warning when session is about to expire
 */

import React, { useState, useEffect } from 'react';
import { getTimeUntilExpiry, formatTimeUntilExpiry } from '../utils/tokenUtils';

const SessionExpiryNotice = ({ onExtendSession }) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeUntilExpiry();
      setTimeRemaining(remaining);

      // Show warning if less than 5 minutes remaining
      const fiveMinutes = 5 * 60 * 1000;
      setShowWarning(remaining > 0 && remaining < fiveMinutes);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!showWarning) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '70px',
        right: '20px',
        backgroundColor: '#fff3cd',
        border: '2px solid #ffc107',
        borderRadius: '8px',
        padding: '15px 20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        maxWidth: '350px',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>⏰</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', color: '#856404', marginBottom: '4px' }}>
            Session Expiring Soon
          </div>
          <div style={{ fontSize: '14px', color: '#856404' }}>
            Time remaining: {formatTimeUntilExpiry()}
          </div>
        </div>
        <button
          onClick={onExtendSession}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ffc107',
            color: '#000',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = '#e0a800')}
          onMouseOut={(e) => (e.target.style.backgroundColor = '#ffc107')}
        >
          Extend
        </button>
      </div>
    </div>
  );
};

export default SessionExpiryNotice;

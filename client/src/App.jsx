import React, { useState, useEffect } from 'react';
import { AuthForms } from './components/AuthForms.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { api } from './api.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Check active session on initial app load
  useEffect(() => {
    async function checkAuthSession() {
      const res = await api.me();
      if (res.success && res.data.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
      setIsInitializing(false);
    }
    checkAuthSession();
  }, []);

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    showToast('Logged out successfully', 'success');
  };

  if (isInitializing) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)'
      }}>
        <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '4px' }}></div>
      </div>
    );
  }

  return (
    <>
      {user ? (
        <Dashboard
          user={user}
          onLogout={handleLogout}
          showToast={showToast}
          onUnauthorized={() => setUser(null)}
        />
      ) : (
        <AuthForms
          onAuthSuccess={(loggedInUser) => setUser(loggedInUser)}
          showToast={showToast}
        />
      )}

      {/* Toast Notification Container */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}

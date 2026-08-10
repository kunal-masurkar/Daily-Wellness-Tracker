import React, { useState, useEffect } from 'react';
import { AuthForms } from './components/AuthForms.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { api } from './api.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [toast, setToast] = useState(null);

  // Centralized toast helper for success and error messages.
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Restore the session once when the app starts.
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

  // Log out on the server, then clear local user state.
  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    showToast('Logged out successfully', 'success');
  };

  // Keep the initial loading state until the auth check finishes.
  if (isInitializing) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-secondary)',
        color: 'var(--text-secondary)'
      }}>
        <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '4px', borderTopColor: 'var(--primary-green)' }}></div>
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

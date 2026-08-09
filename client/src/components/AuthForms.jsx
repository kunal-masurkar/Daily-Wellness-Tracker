import React, { useState } from 'react';
import { Mail, Lock, Activity, ArrowRight } from 'lucide-react';
import { api } from '../api.js';

export function AuthForms({ onAuthSuccess, showToast }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // UX client-side check
    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!isLoginMode && password.length < 10) {
      setError('Password must be at least 10 characters long');
      return;
    }

    setIsLoading(true);

    const response = isLoginMode 
      ? await api.login(email, password)
      : await api.signup(email, password);

    setIsLoading(false);

    if (response.success) {
      showToast(isLoginMode ? 'Logged in successfully' : 'Account created successfully', 'success');
      onAuthSuccess(response.data.user);
    } else {
      setError(response.error);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError('');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-icon" style={{ margin: '0 auto 1rem auto', width: '50px', height: '50px' }}>
            <Activity size={28} />
          </div>
          <h2>{isLoginMode ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{isLoginMode ? 'Sign in to track your daily wellness score' : 'Start tracking your sleep, mood, and energy'}</p>
        </div>

        {error && (
          <div className="server-down-banner" style={{ fontSize: '0.9rem', padding: '0.75rem', marginBottom: '1.2rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <div className="input-icon-wrapper">
              <Mail size={18} />
              <input
                id="auth-email"
                type="email"
                className="form-control"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <div className="input-icon-wrapper">
              <Lock size={18} />
              <input
                id="auth-password"
                type="password"
                className="form-control"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {!isLoginMode && (
              <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.3rem', display: 'block' }}>
                Must be at least 10 characters long
              </small>
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading} id="auth-submit-btn">
            {isLoading ? (
              <div className="spinner"></div>
            ) : (
              <>
                {isLoginMode ? 'Sign In' : 'Create Account'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-toggle-text">
          {isLoginMode ? "Don't have an account?" : 'Already have an account?'}
          <button type="button" className="auth-toggle-btn" onClick={toggleMode} id="auth-toggle-btn">
            {isLoginMode ? 'Sign Up' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  );
}

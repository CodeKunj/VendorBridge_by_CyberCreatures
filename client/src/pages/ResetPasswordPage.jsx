import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { AlertCircle, Check } from 'lucide-react';

const ResetPasswordPage = () => {
  const params = new URLSearchParams(window.location.search);
  const initialToken = params.get('token') || '';
  const initialEmail = params.get('email') || '';
  const [form, setForm] = useState({ token: initialToken, email: initialEmail, newPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await authApi.resetPassword(form);
      setMessage(response.message || 'Your password has been successfully reset.');
    } catch (err) {
      if (err.payload?.errors && Array.isArray(err.payload.errors)) {
        setError(err.payload.errors.map((e) => e.message).join(', '));
      } else {
        setError(err.message || 'Unable to reset your password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">VB</div>
          <h1 className="auth-title">Set New Password</h1>
          <p className="auth-subtitle">Choose a strong, secure password for your account</p>
        </div>

        {message && (
          <div className="erp-alert erp-alert--success" style={{ marginBottom: '16px' }}>
            <Check size={15} /> {message}
          </div>
        )}

        {error && (
          <div className="erp-alert erp-alert--danger" style={{ marginBottom: '16px' }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <form onSubmit={submit} className="auth-form">
          <div className="erp-form-group">
            <label className="erp-label" htmlFor="reset-email">Email Address</label>
            <input
              id="reset-email"
              type="email"
              className="erp-input"
              placeholder="name@company.com"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="erp-form-group">
            <label className="erp-label" htmlFor="reset-token">Reset Token</label>
            <input
              id="reset-token"
              type="text"
              className="erp-input"
              placeholder="Enter recovery token"
              value={form.token}
              onChange={(event) => setForm({ ...form, token: event.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="erp-form-group">
            <label className="erp-label" htmlFor="reset-password">New Password</label>
            <input
              id="reset-password"
              type="password"
              className="erp-input"
              placeholder="••••••••"
              value={form.newPassword}
              onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="erp-btn erp-btn--primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
            {loading ? 'Resetting password...' : 'Update Password'}
          </button>
        </form>

        <div className="auth-footer">
          Back to{' '}
          <Link to="/login" className="auth-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
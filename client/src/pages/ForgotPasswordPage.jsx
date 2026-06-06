import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { AlertCircle, Check } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await authApi.forgotPassword({ email });
      setMessage(response.message || 'If that email address exists in our database, we will send a password reset link.');
    } catch (err) {
      if (err.payload?.errors && Array.isArray(err.payload.errors)) {
        setError(err.payload.errors.map((e) => e.message).join(', '));
      } else {
        setError(err.message || 'Unable to request password reset link.');
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
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">Enter your email to receive a recovery link</p>
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
            <label className="erp-label" htmlFor="forgot-email">Email Address</label>
            <input
              id="forgot-email"
              type="email"
              className="erp-input"
              placeholder="name@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="erp-btn erp-btn--primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
            {loading ? 'Sending link...' : 'Send Recovery Link'}
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

export default ForgotPasswordPage;
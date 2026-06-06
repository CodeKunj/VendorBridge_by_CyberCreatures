import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

const SignupPage = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'vendor', deviceName: 'Web' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signup(form);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.payload?.errors && Array.isArray(err.payload.errors)) {
        setError(err.payload.errors.map((e) => e.message).join(', '));
      } else {
        setError(err.message || 'Unable to create account');
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
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join VendorBridge Sourcing Network</p>
        </div>

        {error && (
          <div className="erp-alert erp-alert--danger" style={{ marginBottom: '16px' }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <form onSubmit={submit} className="auth-form">
          <div className="erp-form-group">
            <label className="erp-label" htmlFor="signup-name">Full Name</label>
            <input
              id="signup-name"
              type="text"
              className="erp-input"
              placeholder="John Doe"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="erp-form-group">
            <label className="erp-label" htmlFor="signup-email">Email Address</label>
            <input
              id="signup-email"
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
            <label className="erp-label" htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              className="erp-input"
              placeholder="••••••••"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="erp-form-group">
            <label className="erp-label" htmlFor="signup-role">Account Type</label>
            <select
              id="signup-role"
              className="erp-select"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
              disabled={loading}
            >
              <option value="vendor">Vendor (Supplier)</option>
              <option value="procurement_officer">Procurement Officer</option>
              <option value="manager">Manager</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <button type="submit" className="erp-btn erp-btn--primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
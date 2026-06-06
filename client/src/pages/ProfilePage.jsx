import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { erpApi } from '../api/erpApi';
import { 
  User, 
  Mail, 
  Shield, 
  Check, 
  AlertCircle, 
  Camera, 
  ArrowLeft 
} from 'lucide-react';

const PRESET_GRADIENTS = [
  { id: 'blue', label: 'Classic Blue', from: '#264dd9', to: '#4568f3' },
  { id: 'purple', label: 'Deep Orchid', from: '#6647c3', to: '#9c7ffd' },
  { id: 'teal', label: 'Sea Breeze', from: '#006a38', to: '#008648' },
  { id: 'pink', label: 'Electric Fuchsia', from: '#d946ef', to: '#8b5cf6' },
  { id: 'emerald', label: 'Forest Mint', from: '#0f766e', to: '#0d9488' },
  { id: 'dark', label: 'Carbon Slate', from: '#2e3134', to: '#444655' }
];

const ProfilePage = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    avatar_url: 'blue', // defaults to blue gradient ID or a custom URL
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        avatar_url: user.avatar_url || 'blue',
      });
    }
  }, [user]);

  const handleNavigate = (item) => {
    navigate(item.id === 'dashboard' ? '/dashboard' : `/${item.id}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Full Name is required');
      return;
    }
    if (!form.email.trim()) {
      setError('Email address is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await erpApi.users.updateProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        avatar_url: form.avatar_url,
      });

      if (response && response.data) {
        // Update user state inside AuthContext instantly
        updateUser(response.data);
        setSuccess('Profile updated successfully.');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'User Profile' }
  ];

  // Helper to determine if avatar_url is a preset or a custom URL
  const selectedPreset = PRESET_GRADIENTS.find(p => p.id === form.avatar_url);
  const isCustomUrl = !selectedPreset && form.avatar_url && form.avatar_url.startsWith('http');

  const getAvatarStyle = () => {
    if (isCustomUrl) {
      return {
        backgroundImage: `url(${form.avatar_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }
    const gradient = selectedPreset || PRESET_GRADIENTS[0];
    return {
      background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`
    };
  };

  const initials = (form.name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

  return (
    <EnterpriseErpLayout
      user={user}
      activeNavId="profile"
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      breadcrumbs={breadcrumbs}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header Title section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button 
            type="button" 
            className="erp-btn erp-btn--outline" 
            style={{ padding: '8px', borderRadius: '50%', width: '36px', height: '36px', display: 'grid', placeItems: 'center' }}
            onClick={() => navigate(user?.role === 'vendor' ? '/vendor-portal' : '/dashboard')}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="erp-title" style={{ margin: 0 }}>My Profile</h1>
            <p className="erp-subtitle" style={{ margin: '4px 0 0 0' }}>Manage your personal details, credentials, and visual representation.</p>
          </div>
        </div>

        {error && <div className="erp-alert erp-alert--danger" style={{ marginBottom: '20px' }}><AlertCircle size={15} /> {error}</div>}
        {success && <div className="erp-alert erp-alert--success" style={{ marginBottom: '20px' }}><Check size={15} /> {success}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Left Column: Avatar Preview & Preset Selection */}
          <div className="erp-card" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 className="erp-card__title" style={{ width: '100%', textAlign: 'left', marginBottom: '20px' }}>Visual Presence</h3>
            
            {/* Avatar Preview */}
            <div 
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: '#ffffff',
                fontSize: '32px',
                fontWeight: '800',
                marginBottom: '16px',
                boxShadow: '0 8px 16px rgba(38, 77, 217, 0.15)',
                border: '4px solid #ffffff',
                ...getAvatarStyle()
              }}
            >
              {!isCustomUrl && initials}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--erp-on-surface)' }}>{form.name || 'User Name'}</div>
              <div style={{ fontSize: '12px', color: 'var(--erp-on-surface-variant)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {user?.roleLabel || user?.role || 'ERP Member'}
              </div>
            </div>

            {/* Presets Grid */}
            <div style={{ width: '100%', borderTop: '1px solid var(--erp-outline-variant)', paddingTop: '20px' }}>
              <span className="erp-label" style={{ display: 'block', textAlign: 'left', marginBottom: '10px' }}>Choose Theme Color</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                {PRESET_GRADIENTS.map(gradient => {
                  const isActive = form.avatar_url === gradient.id;
                  return (
                    <button
                      key={gradient.id}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, avatar_url: gradient.id }))}
                      style={{
                        height: '44px',
                        borderRadius: 'var(--erp-radius-default)',
                        border: isActive ? '2px solid var(--erp-primary)' : '1px solid var(--erp-outline-variant)',
                        background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        position: 'relative',
                        transition: 'transform 100ms ease'
                      }}
                      title={gradient.label}
                    >
                      {isActive && (
                        <div style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          background: 'var(--erp-primary)',
                          color: '#ffffff',
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          display: 'grid',
                          placeItems: 'center',
                          border: '2px solid #ffffff'
                        }}>
                          <Check size={8} strokeWidth={4} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Image URL */}
              <div style={{ textAlign: 'left', marginTop: '16px' }}>
                <label className="erp-label">Or Custom Image URL</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="url"
                    className="erp-input"
                    placeholder="https://example.com/avatar.jpg"
                    value={isCustomUrl ? form.avatar_url : ''}
                    onChange={(e) => setForm(prev => ({ ...prev, avatar_url: e.target.value || 'blue' }))}
                    style={{ fontSize: '13px' }}
                  />
                  {isCustomUrl && (
                    <button 
                      type="button" 
                      onClick={() => setForm(prev => ({ ...prev, avatar_url: 'blue' }))}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 0,
                        background: 'transparent',
                        color: 'var(--erp-outline)',
                        cursor: 'pointer'
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Account Details Form */}
          <div className="erp-card" style={{ padding: '24px' }}>
            <h3 className="erp-card__title" style={{ marginBottom: '20px' }}>Account Settings</h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="erp-form-group">
                  <label className="erp-label">Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--erp-outline)' }} />
                    <input 
                      type="text" 
                      className="erp-input" 
                      value={form.name} 
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      style={{ paddingLeft: '36px' }}
                      required
                    />
                  </div>
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--erp-outline)' }} />
                    <input 
                      type="email" 
                      className="erp-input" 
                      value={form.email} 
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      style={{ paddingLeft: '36px' }}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="erp-form-group">
                  <label className="erp-label">System Role</label>
                  <div style={{ position: 'relative' }}>
                    <Shield size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--erp-outline)' }} />
                    <input 
                      type="text" 
                      className="erp-input" 
                      value={user?.roleLabel || user?.role || 'ERP Member'} 
                      style={{ paddingLeft: '36px', textTransform: 'capitalize' }}
                      disabled 
                    />
                  </div>
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Account Status</label>
                  <input 
                    type="text" 
                    className="erp-input" 
                    value="Active Status" 
                    disabled 
                  />
                </div>
              </div>

              <div className="erp-form-group">
                <label className="erp-label">Unique User ID</label>
                <input 
                  type="text" 
                  className="erp-input" 
                  value={user?.id || ''} 
                  disabled 
                  style={{ fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.05em' }}
                />
              </div>

              {/* Warning box */}
              <div 
                style={{ 
                  background: 'var(--erp-surface-container-low)', 
                  border: '1px solid var(--erp-outline-variant)',
                  padding: '14px', 
                  borderRadius: 'var(--erp-radius-default)',
                  fontSize: '12.5px',
                  color: 'var(--erp-on-surface-variant)',
                  lineHeight: '1.5',
                  display: 'flex',
                  gap: '10px'
                }}
              >
                <Shield size={18} style={{ color: 'var(--erp-primary)', flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Security Note:</strong> Account authorization levels, unique user IDs, and active statuses are administered strictly via administrative permissions. For profile verification or security overrides, reach out directly to the IT system operations desk.
                </span>
              </div>

              {/* Action Buttons */}
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  gap: '12px', 
                  marginTop: '12px',
                  borderTop: '1px solid var(--erp-outline-variant)',
                  paddingTop: '20px'
                }}
              >
                <button 
                  type="button" 
                  className="erp-btn erp-btn--outline" 
                  onClick={() => navigate(user?.role === 'vendor' ? '/vendor-portal' : '/dashboard')}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="erp-btn erp-btn--primary" 
                  disabled={loading}
                >
                  {loading ? 'Saving Settings...' : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>

        </div>

      </div>
    </EnterpriseErpLayout>
  );
};

export default ProfilePage;

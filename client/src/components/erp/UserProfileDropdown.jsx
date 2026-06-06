import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const UserProfileDropdown = ({ user, onLogout, onProfile, onSettings }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const initials = (user?.name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const PRESET_GRADIENTS = {
    blue: { from: '#264dd9', to: '#4568f3' },
    purple: { from: '#6647c3', to: '#9c7ffd' },
    teal: { from: '#006a38', to: '#008648' },
    pink: { from: '#d946ef', to: '#8b5cf6' },
    emerald: { from: '#0f766e', to: '#0d9488' },
    dark: { from: '#2e3134', to: '#444655' }
  };

  const avatarUrl = user?.avatar_url || 'blue';
  const isCustomUrl = typeof avatarUrl === 'string' && avatarUrl.startsWith('http');
  const gradient = PRESET_GRADIENTS[avatarUrl] || PRESET_GRADIENTS['blue'];
  const avatarStyle = isCustomUrl ? {} : {
    background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`
  };

  return (
    <div className="erp-profile-dropdown" ref={rootRef}>
      <button
        className="erp-profile-dropdown__trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {isCustomUrl ? (
          <img 
            src={avatarUrl} 
            className="erp-profile-dropdown__avatar" 
            style={{ objectFit: 'cover' }} 
            alt="User avatar" 
          />
        ) : (
          <span 
            className="erp-profile-dropdown__avatar" 
            style={avatarStyle} 
            aria-hidden="true"
          >
            {initials}
          </span>
        )}
        <span style={{ textAlign: 'left' }}>
          <span className="erp-profile-dropdown__name">{user?.name || 'User'}</span>
          <span className="erp-profile-dropdown__role">{user?.roleLabel || user?.role || 'ERP User'}</span>
        </span>
        <ChevronDown size={14} style={{ color: 'var(--erp-outline)', marginLeft: '4px' }} />
      </button>

      {open ? (
        <div className="erp-profile-dropdown__menu" role="menu">
          <button className="erp-profile-dropdown__menu-item" type="button" onClick={() => { onProfile(); setOpen(false); }}>My Profile</button>
          {user?.role === 'admin' && (
            <button className="erp-profile-dropdown__menu-item" type="button" onClick={() => { onSettings(); setOpen(false); }}>Settings</button>
          )}
          <button className="erp-profile-dropdown__menu-item" type="button" onClick={() => { onLogout(); setOpen(false); }}>Sign out</button>
        </div>
      ) : null}
    </div>
  );
};

export default UserProfileDropdown;
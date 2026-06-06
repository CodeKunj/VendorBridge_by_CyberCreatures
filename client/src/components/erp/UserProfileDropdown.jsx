import React, { useEffect, useRef, useState } from 'react';

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

  return (
    <div className="erp-profile-dropdown" ref={rootRef}>
      <button
        className="erp-profile-dropdown__trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="erp-profile-dropdown__avatar" aria-hidden="true">{initials}</span>
        <span>
          <span className="erp-profile-dropdown__name">{user?.name || 'User'}</span>
          <span className="erp-profile-dropdown__role">{user?.roleLabel || user?.role || 'ERP User'}</span>
        </span>
      </button>

      {open ? (
        <div className="erp-profile-dropdown__menu" role="menu">
          <button className="erp-profile-dropdown__menu-item" type="button" onClick={onProfile}>My Profile</button>
          <button className="erp-profile-dropdown__menu-item" type="button" onClick={onSettings}>Settings</button>
          <button className="erp-profile-dropdown__menu-item" type="button" onClick={onLogout}>Sign out</button>
        </div>
      ) : null}
    </div>
  );
};

export default UserProfileDropdown;
import React from 'react';
import SearchBar from './SearchBar';
import UserProfileDropdown from './UserProfileDropdown';

const TopNavbar = ({
  user,
  searchValue,
  onSearchChange,
  onToggleSidebar,
  onToggleNotifications,
  onLogout,
  onProfile,
  onSettings,
  notificationCount = 0,
}) => (
  <header className="erp-topbar">
    <button className="erp-icon-button erp-mobile-toggle" type="button" onClick={onToggleSidebar} aria-label="Open sidebar">
      ☰
    </button>

    <SearchBar value={searchValue} onChange={onSearchChange} />

    <div className="erp-topbar__actions">
      <button className="erp-icon-button" type="button" onClick={onToggleNotifications} aria-label="Open notifications">
        🔔{notificationCount > 0 ? <span aria-hidden="true">{notificationCount}</span> : null}
      </button>
      <UserProfileDropdown
        user={user}
        onLogout={onLogout}
        onProfile={onProfile}
        onSettings={onSettings}
      />
    </div>
  </header>
);

export default TopNavbar;
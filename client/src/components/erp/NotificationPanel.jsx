import React from 'react';

const NotificationPanel = ({ open, notifications = [], onClose }) => {
  if (!open) {
    return null;
  }

  return (
    <>
      <div className="erp-layout-overlay" onClick={onClose} aria-hidden="true" />
      <section className="erp-notification-panel" aria-label="Notifications">
        <header className="erp-notification-panel__header">
          <div>
            <h2 className="erp-notification-panel__title">Notifications</h2>
            <p className="erp-card__subtitle">Operational alerts and approvals</p>
          </div>
          <button className="erp-icon-button" type="button" onClick={onClose} aria-label="Close notifications">
            ×
          </button>
        </header>

        <div className="erp-notification-list">
          {notifications.length === 0 ? (
            <div className="erp-notification-item">
              <h3 className="erp-notification-item__title">No new notifications</h3>
              <p className="erp-notification-item__body">You are up to date.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <article className="erp-notification-item" key={notification.id}>
                <div className="erp-notification-item__meta">
                  <span>{notification.category || 'System'}</span>
                  <span>{notification.time || 'Just now'}</span>
                </div>
                <h3 className="erp-notification-item__title">{notification.title}</h3>
                <p className="erp-notification-item__body">{notification.message}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </>
  );
};

export default NotificationPanel;
import React, { useState, useMemo } from 'react';

const NotificationPanel = ({ open, notifications = [], onMarkRead, onMarkAllRead, onDelete, onClose }) => {
  const [activeTab, setActiveTab] = useState('all');

  if (!open) {
    return null;
  }

  // Filter notifications by category
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter(n => {
      const type = (n.type || '').toLowerCase();
      if (activeTab === 'rfq') return type === 'rfq';
      if (activeTab === 'quotation') return type === 'quotation';
      if (activeTab === 'approval') return type === 'approval';
      if (activeTab === 'po') return type === 'po';
      if (activeTab === 'invoice') return type === 'invoice';
      return false;
    });
  }, [notifications, activeTab]);

  const getBadgeClass = (type) => {
    switch ((type || '').toLowerCase()) {
      case 'rfq': return 'erp-badge erp-badge--info';
      case 'quotation': return 'erp-badge erp-badge--warning';
      case 'approval': return 'erp-badge erp-badge--danger';
      case 'po': return 'erp-badge erp-badge--success';
      case 'invoice': return 'erp-badge erp-badge--draft';
      default: return 'erp-badge';
    }
  };

  return (
    <>
      <div className="erp-layout-overlay" onClick={onClose} aria-hidden="true" style={{ zIndex: 35 }} />
      <section className="erp-notification-panel" aria-label="Notifications" style={{ zIndex: 40, display: 'flex', flexDirection: 'column' }}>
        <header className="erp-notification-panel__header" style={{ flexShrink: 0 }}>
          <div>
            <h2 className="erp-notification-panel__title">Notifications</h2>
            <p className="erp-card__subtitle" style={{ margin: '2px 0 0' }}>Real-time system updates</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {notifications.some(n => !n.read_at) && (
              <button 
                onClick={onMarkAllRead} 
                className="erp-button erp-button--secondary" 
                style={{ fontSize: '0.78rem', padding: '6px 10px', height: 'auto', borderRadius: '10px' }}
              >
                Mark all read
              </button>
            )}
            <button className="erp-icon-button" type="button" onClick={onClose} aria-label="Close notifications" style={{ width: '30px', height: '30px', borderRadius: '10px' }}>
              ×
            </button>
          </div>
        </header>

        {/* Tab Filters */}
        <div style={{ display: 'flex', gap: '4px', padding: '10px 20px', borderBottom: '1px solid var(--erp-border)', overflowX: 'auto', background: '#fafbfc', flexShrink: 0 }}>
          {['all', 'rfq', 'quotation', 'approval', 'po', 'invoice'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                border: 0,
                background: activeTab === tab ? 'var(--erp-blue-900)' : 'transparent',
                color: activeTab === tab ? '#fff' : 'var(--erp-text-muted)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 150ms ease'
              }}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Notification List Body */}
        <div className="erp-notification-list" style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>
          {filteredNotifications.length === 0 ? (
            <div className="erp-notification-item" style={{ textAlign: 'center', padding: '30px 20px' }}>
              <h3 className="erp-notification-item__title" style={{ color: 'var(--erp-text-muted)' }}>No notifications found</h3>
              <p className="erp-notification-item__body">You have no alerts in this category.</p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <article 
                className="erp-notification-item" 
                key={n.id} 
                style={{ 
                  position: 'relative', 
                  borderLeft: !n.read_at ? '4px solid var(--erp-blue-700)' : '1px solid var(--erp-border)',
                  background: !n.read_at ? 'rgba(45, 107, 179, 0.03)' : '#fff',
                  marginBottom: '10px'
                }}
              >
                <div className="erp-notification-item__meta">
                  <span className={getBadgeClass(n.type)}>{n.type || 'System'}</span>
                  <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <h3 className="erp-notification-item__title">{n.title}</h3>
                <p className="erp-notification-item__body" style={{ fontSize: '0.86rem', color: 'var(--erp-text)' }}>{n.message}</p>
                
                {/* Actions Panel */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--erp-border)' }}>
                  {!n.read_at && (
                    <button 
                      onClick={() => onMarkRead(n.id)} 
                      style={{ border: 0, background: 'transparent', color: 'var(--erp-blue-700)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Mark read
                    </button>
                  )}
                  <button 
                    onClick={() => onDelete(n.id)} 
                    style={{ border: 0, background: 'transparent', color: '#b91c1c', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </>
  );
};

export default NotificationPanel;
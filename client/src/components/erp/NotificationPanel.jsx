import React, { useState, useMemo } from 'react';
import { X, Check } from 'lucide-react';

const NotificationPanel = ({ open, notifications = [], onMarkRead, onMarkAllRead, onDelete, onClose }) => {
  const [activeTab, setActiveTab] = useState('all');

  const safeNotifications = useMemo(() => {
    return Array.isArray(notifications) ? notifications : [];
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return safeNotifications;
    return safeNotifications.filter(n => {
      const type = (n.type || '').toLowerCase();
      if (activeTab === 'rfq') return type === 'rfq';
      if (activeTab === 'quotation') return type === 'quotation';
      if (activeTab === 'approval') return type === 'approval';
      if (activeTab === 'po') return type === 'po';
      if (activeTab === 'invoice') return type === 'invoice';
      return false;
    });
  }, [safeNotifications, activeTab]);

  if (!open) {
    return null;
  }

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

  const formatTime = (dateStr) => {
    try {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <>
      <div className="erp-layout-overlay" onClick={onClose} aria-hidden="true" style={{ zIndex: 35 }} />
      <section className="erp-notification-panel" aria-label="Notifications" style={{ zIndex: 40, display: 'flex', flexDirection: 'column' }}>
        <header className="erp-notification-panel__header" style={{ flexShrink: 0 }}>
          <div>
            <h2 className="erp-notification-panel__title">Notifications</h2>
            <p className="erp-card__subtitle" style={{ margin: '2px 0 0' }}>System alerts</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {safeNotifications.some(n => !n.read_at) && (
              <button 
                onClick={onMarkAllRead} 
                className="erp-btn erp-btn--secondary" 
                style={{ fontSize: '0.75rem', padding: '0 10px', height: '28px', borderRadius: 'var(--erp-radius-default)' }}
              >
                Mark all read
              </button>
            )}
            <button className="erp-icon-button" type="button" onClick={onClose} aria-label="Close notifications" style={{ width: '28px', height: '28px', borderRadius: 'var(--erp-radius-default)' }}>
              <X size={14} />
            </button>
          </div>
        </header>

        {/* Tab Filters */}
        <div className="no-scrollbar" style={{ display: 'flex', gap: '4px', padding: '10px 16px', borderBottom: '1px solid var(--erp-outline-variant)', overflowX: 'auto', background: 'var(--erp-surface-dim)', flexShrink: 0 }}>
          {['all', 'rfq', 'quotation', 'approval', 'po', 'invoice'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                border: 0,
                background: activeTab === tab ? 'var(--erp-primary)' : 'transparent',
                color: activeTab === tab ? '#fff' : 'var(--erp-on-surface-variant)',
                padding: '6px 10px',
                borderRadius: 'var(--erp-radius-default)',
                fontSize: '0.75rem',
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
        <div className="erp-notification-list" style={{ overflowY: 'auto', flex: 1, padding: '16px' }}>
          {filteredNotifications.length === 0 ? (
            <div className="erp-notification-item" style={{ textAlign: 'center', padding: '30px 20px', border: 0 }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--erp-outline)' }}>No notifications</h3>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <article 
                className="erp-notification-item" 
                key={n.id} 
                style={{ 
                  position: 'relative', 
                  borderLeft: !n.read_at ? '3px solid var(--erp-primary)' : '1px solid var(--erp-outline-variant)',
                  background: !n.read_at ? 'rgba(38, 77, 217, 0.02)' : '#fff',
                  marginBottom: '10px'
                }}
              >
                <div className="erp-notification-item__meta">
                  <span className={getBadgeClass(n.type)}>{n.type || 'System'}</span>
                  <span>{formatTime(n.created_at)}</span>
                </div>
                <h3 className="erp-notification-item__title">{n.title}</h3>
                <p className="erp-notification-item__body">{n.message}</p>
                
                {/* Actions Panel */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--erp-outline-variant)' }}>
                  {!n.read_at && (
                    <button 
                      onClick={() => onMarkRead(n.id)} 
                      style={{ border: 0, background: 'transparent', color: 'var(--erp-primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                    >
                      <Check size={12} /> Mark read
                    </button>
                  )}
                  <button 
                    onClick={() => onDelete(n.id)} 
                    style={{ border: 0, background: 'transparent', color: 'var(--erp-error)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
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
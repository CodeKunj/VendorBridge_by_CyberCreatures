import React from 'react';
import { X } from 'lucide-react';

const Sidebar = ({ items = [], activeId, onNavigate, onClose }) => (
  <aside className="erp-sidebar" aria-label="Primary navigation">
    <div className="erp-sidebar__brand">
      <div className="erp-sidebar__brand-mark">VB</div>
      <div>
        <div className="erp-sidebar__brand-title">VendorBridge ERP</div>
        <div className="erp-sidebar__brand-subtitle">Procurement Portal</div>
      </div>
      <button className="erp-icon-button erp-sidebar__mobile-close" type="button" onClick={onClose} aria-label="Close sidebar">
        <X size={18} />
      </button>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
      <div className="erp-sidebar__section-title">Workspace</div>
      <nav className="erp-sidebar__nav">
        {items.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`erp-sidebar__item${activeId === item.id ? ' is-active' : ''}`}
              onClick={() => onNavigate?.(item)}
            >
              <span className="erp-sidebar__item-icon" aria-hidden="true">
                {IconComponent ? <IconComponent size={18} /> : '•'}
              </span>
              <span className="erp-sidebar__item-label">
                <span className="erp-sidebar__item-title">{item.label}</span>
                {item.caption ? <span className="erp-sidebar__item-caption">{item.caption}</span> : null}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  </aside>
);

export default Sidebar;
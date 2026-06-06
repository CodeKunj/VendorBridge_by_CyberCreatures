import React from 'react';

const Breadcrumbs = ({ items = [] }) => (
  <nav className="erp-breadcrumbs" aria-label="Breadcrumb">
    {items.map((item, index) => {
      const isLast = index === items.length - 1;

      return (
        <span className="erp-breadcrumbs__item" key={`${item.label}-${item.href || index}`}>
          {index > 0 ? <span className="erp-breadcrumbs__separator" aria-hidden="true">/</span> : null}
          {isLast || !item.href ? (
            <span className="erp-breadcrumbs__current" aria-current={isLast ? 'page' : undefined}>{item.label}</span>
          ) : (
            <a className="erp-breadcrumbs__link" href={item.href}>{item.label}</a>
          )}
        </span>
      );
    })}
  </nav>
);

export default Breadcrumbs;
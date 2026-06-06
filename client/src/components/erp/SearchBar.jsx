import React from 'react';

const SearchBar = ({ value, onChange, placeholder = 'Search vendors, POs, invoices, approvals...' }) => (
  <label className="erp-search">
    <span className="erp-search__icon" aria-hidden="true">⌕</span>
    <input
      className="erp-search__input"
      type="search"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      aria-label="Search"
    />
  </label>
);

export default SearchBar;
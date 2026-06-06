import React from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ value, onChange, placeholder = 'Search transactions, RFQs, invoices...' }) => (
  <label className="erp-search">
    <span className="erp-search__icon" aria-hidden="true">
      <Search size={16} />
    </span>
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
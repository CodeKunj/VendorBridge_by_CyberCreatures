const ROLES = {
  ADMIN: 'admin',
  PROCUREMENT_OFFICER: 'procurement_officer',
  VENDOR: 'vendor',
  MANAGER: 'manager',
};

const ROLE_VALUES = Object.values(ROLES);

const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.PROCUREMENT_OFFICER]: 'Procurement Officer',
  [ROLES.VENDOR]: 'Vendor',
  [ROLES.MANAGER]: 'Manager',
};

module.exports = {
  ROLES,
  ROLE_VALUES,
  ROLE_LABELS,
};
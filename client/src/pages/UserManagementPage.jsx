import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { erpApi } from '../api/erpApi';
import {
  Users,
  Search,
  RefreshCw,
  Shield,
  ShieldCheck,
  UserCog,
  Package,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Calendar,
} from 'lucide-react';

/* ─────────── Helpers ─────────── */
const ROLE_META = {
  admin:               { label: 'Admin',               color: '#4f46e5', bg: '#ede9fe', icon: Shield },
  manager:             { label: 'Manager',             color: '#0891b2', bg: '#cffafe', icon: ShieldCheck },
  procurement_officer: { label: 'Procurement Officer', color: '#d97706', bg: '#fef3c7', icon: UserCog },
  vendor:              { label: 'Vendor',              color: '#059669', bg: '#d1fae5', icon: Package },
};

const STATUS_META = {
  active:   { label: 'Active',   color: '#059669', bg: '#d1fae5', icon: CheckCircle2 },
  inactive: { label: 'Inactive', color: '#6b7280', bg: '#f3f4f6', icon: XCircle },
  suspended:{ label: 'Suspended',color: '#dc2626', bg: '#fee2e2', icon: AlertCircle },
};

const avatarInitials = (name = '') =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

const avatarColor = (name = '') => {
  const colors = ['#4f46e5','#0891b2','#d97706','#059669','#be185d','#7c3aed'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % colors.length;
  return colors[h];
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ─────────── Stat Card ─────────── */
const StatCard = ({ icon: Icon, color, bg, label, value }) => (
  <div style={{
    background: '#fff',
    border: '1px solid #e8eaf0',
    borderRadius: 14,
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    transition: 'transform 180ms ease, box-shadow 180ms ease',
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; }}
  >
    <span style={{ width: 48, height: 48, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={22} color={color} />
    </span>
    <div>
      <p style={{ margin: 0, fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 800, color: '#111827' }}>{value}</p>
    </div>
  </div>
);

/* ─────────── Main Page ─────────── */
const UserManagementPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const LIMIT = 15;

  const breadcrumbs = useMemo(() => [
    { label: 'Home', href: '/' },
    { label: 'User Management' },
  ], []);

  /* ── Fetch ── */
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page, limit: LIMIT };
      if (roleFilter !== 'all') params.role = roleFilter;
      if (search.trim()) params.search = search.trim();
      const res = await erpApi.users.list(params);
      if (res && res.data) {
        setUsers(res.data);
        setTotal(res.meta?.total ?? res.data.length);
        setTotalPages(res.meta?.totalPages ?? 1);
      }
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [page, roleFilter]);

  /* search: debounce or load on submit */
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  /* ── Stats ── */
  const stats = useMemo(() => {
    const byRole = (r) => users.filter((u) => u.role === r).length;
    return [
      { icon: Users,     color: '#4f46e5', bg: '#ede9fe', label: 'Total Users',           value: total },
      { icon: Shield,    color: '#4f46e5', bg: '#ede9fe', label: 'Admins',                value: byRole('admin') },
      { icon: ShieldCheck,color:'#0891b2', bg: '#cffafe', label: 'Managers',              value: byRole('manager') },
      { icon: UserCog,   color: '#d97706', bg: '#fef3c7', label: 'Procurement Officers',  value: byRole('procurement_officer') },
      { icon: Package,   color: '#059669', bg: '#d1fae5', label: 'Vendors',               value: byRole('vendor') },
    ];
  }, [users, total]);

  const handleNavigate = (item) => navigate(item.id === 'dashboard' ? '/dashboard' : `/${item.id}`);
  const handleLogout   = async () => { await logout(); navigate('/login', { replace: true }); };

  return (
    <EnterpriseErpLayout
      activeNavId="user-management"
      breadcrumbs={breadcrumbs}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      onProfile={() => navigate('/profile')}
      onSettings={() => navigate('/settings')}
    >
      <style>{`
        .um-table-row:hover { background: #f8faff !important; }
        .um-filter-btn.active { background: #4f46e5 !important; color: #fff !important; }
        .um-filter-btn:hover:not(.active) { background: #f3f4f6 !important; }
        .um-refresh-btn:hover { background: #f3f4f6 !important; }
        .um-page-btn:hover:not(:disabled) { background: #4f46e5 !important; color: #fff !important; }
        .um-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} color="#fff" />
            </span>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>User Management</h1>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>View and manage all platform users by role</p>
            </div>
          </div>
          <button
            className="um-refresh-btn"
            onClick={() => loadUsers()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151', transition: 'background 150ms' }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── Filters ── */}
      <div style={{
        background: '#fff', border: '1px solid #e8eaf0', borderRadius: 14,
        padding: '16px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center'
      }}>
        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 200 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              style={{ width: '100%', paddingLeft: 34, paddingRight: 12, height: 38, border: '1px solid #e5e7eb', borderRadius: 9, fontSize: 13, color: '#111827', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" style={{ padding: '0 16px', background: '#4f46e5', color: '#fff', border: 0, borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', height: 38 }}>
            Search
          </button>
        </form>

        {/* Role filter buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all', 'admin', 'manager', 'procurement_officer', 'vendor'].map((r) => (
            <button
              key={r}
              className={`um-filter-btn${roleFilter === r ? ' active' : ''}`}
              onClick={() => { setRoleFilter(r); setPage(1); }}
              style={{
                padding: '6px 14px', border: '1px solid #e5e7eb', borderRadius: 8,
                background: '#fff', color: '#374151', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all 150ms', textTransform: 'capitalize',
              }}
            >
              {r === 'all' ? 'All Roles' : r === 'procurement_officer' ? 'Procurement' : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: '14px 18px', marginBottom: 20, color: '#dc2626', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 2fr 1.2fr 1fr 1.2fr 1.4fr', padding: '12px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          {['User', 'Email', 'Role', 'Status', 'Joined', 'Last Active'].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af' }}>
            <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
            <p style={{ margin: '10px 0 0', fontSize: 14 }}>Loading users…</p>
          </div>
        )}

        {/* Empty */}
        {!loading && users.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af' }}>
            <Users size={36} style={{ marginBottom: 10, opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>No users found</p>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>Try adjusting your search or role filter</p>
          </div>
        )}

        {/* Rows */}
        {!loading && users.map((u, i) => {
          const roleMeta   = ROLE_META[u.role]   || { label: u.role,   color: '#6b7280', bg: '#f3f4f6', icon: Users };
          const statusMeta = STATUS_META[u.status] || { label: u.status, color: '#6b7280', bg: '#f3f4f6', icon: Clock };
          const RoleIcon   = roleMeta.icon;
          const StatusIcon = statusMeta.icon;
          return (
            <div
              key={u.id}
              className="um-table-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '2.5fr 2fr 1.2fr 1fr 1.2fr 1.4fr',
                padding: '14px 20px',
                borderBottom: i < users.length - 1 ? '1px solid #f3f4f6' : 'none',
                alignItems: 'center',
                transition: 'background 120ms',
              }}
            >
              {/* User */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.name} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }} />
                ) : (
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: avatarColor(u.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {avatarInitials(u.name)}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name || '—'}</p>
                  <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9ca3af' }}>ID: {u.id?.slice(0, 8)}…</p>
                </div>
              </div>

              {/* Email */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <Mail size={13} color="#9ca3af" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email || '—'}</span>
              </div>

              {/* Role */}
              <div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: roleMeta.bg, color: roleMeta.color,
                }}>
                  <RoleIcon size={11} />
                  {roleMeta.label}
                </span>
              </div>

              {/* Status */}
              <div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: statusMeta.bg, color: statusMeta.color,
                }}>
                  <StatusIcon size={11} />
                  {statusMeta.label}
                </span>
              </div>

              {/* Joined */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6b7280', fontSize: 12 }}>
                <Calendar size={12} />
                {fmtDate(u.created_at)}
              </div>

              {/* Last Active */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6b7280', fontSize: 12 }}>
                <Clock size={12} />
                {fmtDate(u.last_login_at)}
              </div>
            </div>
          );
        })}

        {/* Pagination footer */}
        {!loading && users.length > 0 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              Showing <strong style={{ color: '#111827' }}>{users.length}</strong> of <strong style={{ color: '#111827' }}>{total}</strong> users
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                className="um-page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151', transition: 'all 150ms', gap: 4 }}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <span style={{ fontSize: 13, color: '#374151', fontWeight: 600, padding: '0 4px' }}>
                {page} / {totalPages}
              </span>
              <button
                className="um-page-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151', transition: 'all 150ms', gap: 4 }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </EnterpriseErpLayout>
  );
};

export default UserManagementPage;

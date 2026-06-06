import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { erpApi } from '../api/erpApi';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  AlertCircle 
} from 'lucide-react';

const ActivityLogsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(15);
  const [selectedModule, setSelectedModule] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const breadcrumbs = useMemo(() => ([
    { label: 'Home', href: '/' },
    { label: 'Activity Logs' }
  ]), []);

  const loadActivityLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await erpApi.activityLogs.list({ page, limit });
      if (res && res.data) {
        setLogs(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load activity logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivityLogs();
  }, [page]);

  const handleNavigate = (item) => {
    navigate(item.id === 'dashboard' ? '/dashboard' : `/${item.id}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const filteredLogs = logs.filter((log) => {
    const matchesModule = selectedModule === 'all' || (log.module || '').toLowerCase() === selectedModule.toLowerCase();
    const matchesSearch = 
      searchTerm === '' ||
      (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.users?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.ip_address || '').includes(searchTerm);
    return matchesModule && matchesSearch;
  });

  const getModuleBadgeClass = (mod) => {
    switch ((mod || '').toLowerCase()) {
      case 'sourcing': return 'erp-badge erp-badge--info';
      case 'purchasing': return 'erp-badge erp-badge--success';
      case 'billing': return 'erp-badge erp-badge--draft';
      case 'approvals': return 'erp-badge erp-badge--danger';
      default: return 'erp-badge erp-badge--warning';
    }
  };

  return (
    <EnterpriseErpLayout
      user={user}
      activeNavId="activity-logs"
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      onProfile={() => navigate('/dashboard')}
      onSettings={() => navigate('/settings')}
      breadcrumbs={breadcrumbs}
    >
      <h1 className="erp-title">Activity & Audit Logs</h1>
      <p className="erp-subtitle">Track operations, user modifications, and document transitions across ERP modules.</p>

      {error && (
        <div className="erp-alert erp-alert--danger">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <section className="erp-card" style={{ marginBottom: '20px' }}>
        <div className="erp-card__body" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 300px' }} className="erp-form-group">
            <label className="erp-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Search size={13} /> Search Audit Logs
            </label>
            <input 
              type="text" 
              className="erp-input"
              placeholder="Search by action, user name, or IP address..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ width: '220px' }} className="erp-form-group">
            <label className="erp-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={13} /> Filter Module
            </label>
            <select 
              className="erp-select" 
              value={selectedModule} 
              onChange={(e) => setSelectedModule(e.target.value)}
            >
              <option value="all">All Modules</option>
              <option value="sourcing">Sourcing</option>
              <option value="purchasing">Purchasing</option>
              <option value="billing">Billing</option>
              <option value="approvals">Approvals</option>
              <option value="system">System</option>
            </select>
          </div>

          <button 
            className="erp-btn erp-btn--outline" 
            onClick={loadActivityLogs}
            style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} /> Refresh Logs
          </button>
        </div>
      </section>

      {/* Logs Table */}
      <section className="erp-card">
        <div className="erp-card__body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--erp-outline)' }}>
              Loading audit logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--erp-outline)' }}>
              No audit logs found.
            </div>
          ) : (
            <div className="erp-table-wrapper" style={{ border: 0, borderRadius: 0 }}>
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Module</th>
                    <th>Action</th>
                    <th>IP Address</th>
                    <th style={{ textAlign: 'right' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {new Date(log.created_at).toLocaleString([], {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>
                        <td style={{ fontWeight: 600 }}>{log.users?.name || 'System / Guest'}</td>
                        <td>
                          <span className="erp-badge erp-badge--draft" style={{ fontSize: '0.7rem' }}>
                            {log.users?.role || 'SYSTEM'}
                          </span>
                        </td>
                        <td>
                          <span className={getModuleBadgeClass(log.module)}>
                            {log.module}
                          </span>
                        </td>
                        <td>
                          {log.action}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--erp-outline)' }}>
                          {log.ip_address || '127.0.0.1'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="erp-btn erp-btn--outline" 
                            style={{ padding: '4px 10px', height: '28px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                          >
                            {expandedLogId === log.id ? <EyeOff size={12} /> : <Eye size={12} />}
                            {expandedLogId === log.id ? 'Hide' : 'Inspect'}
                          </button>
                        </td>
                      </tr>
                      {expandedLogId === log.id && (
                        <tr>
                          <td colSpan={7} style={{ background: 'var(--erp-surface-container-low)', padding: '16px 24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '0.8rem', color: 'var(--erp-outline)' }}>
                                <strong>Log ID:</strong> {log.id}
                              </div>
                              {log.entity_id && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--erp-outline)' }}>
                                  <strong>Linked Entity ID:</strong> {log.entity_id}
                                </div>
                              )}
                              <div>
                                <strong style={{ fontSize: '0.8rem', color: 'var(--erp-outline)' }}>Log Metadata Parameters:</strong>
                                <pre style={{
                                  background: 'var(--erp-surface-container-highest)',
                                  color: 'var(--erp-on-surface)',
                                  padding: '12px',
                                  borderRadius: '8px',
                                  fontSize: '0.78rem',
                                  fontFamily: 'monospace',
                                  marginTop: '6px',
                                  overflowX: 'auto',
                                  border: '1px solid var(--erp-outline-variant)'
                                }}>
                                  {JSON.stringify(log.metadata || {}, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--erp-outline)' }}>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="erp-btn erp-btn--outline" 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(p - 1, 1))}
            >
              Previous
            </button>
            <button 
              className="erp-btn erp-btn--outline" 
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </EnterpriseErpLayout>
  );
};

export default ActivityLogsPage;

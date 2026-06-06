import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseErpLayout } from '../components/erp';
import { useAuth } from '../context/AuthContext';
import { erpApi } from '../api/erpApi';

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
    navigate(`/${item.id}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Filter and search logs client-side to make interactions lightning-fast
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
      activeNavId="activity-logs"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Activity Logs' }
      ]}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    >
      <div className="erp-page-header">
        <h1 className="erp-page-title">Activity & Audit Logs</h1>
        <p className="erp-page-subtitle">Track operations, user modifications, and document transitions across ERP modules.</p>
      </div>

      {error && (
        <div className="erp-alert erp-alert--danger" style={{ marginBottom: '20px' }}>
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <section className="erp-card" style={{ marginBottom: '20px' }}>
        <div className="erp-card__body" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 300px' }}>
            <label className="erp-form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--erp-text-muted)' }}>Search Audit Logs</label>
            <input 
              type="text" 
              className="erp-input"
              placeholder="Search by action, user name, or IP address..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ width: '220px' }}>
            <label className="erp-form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--erp-text-muted)' }}>Filter Module</label>
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
            className="erp-button erp-button--secondary" 
            onClick={loadActivityLogs}
            style={{ marginTop: '20px', height: '44px' }}
          >
            Refresh Logs
          </button>
        </div>
      </section>

      {/* Logs Table */}
      <section className="erp-card">
        <div className="erp-card__body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <span className="erp-spinner" />
              <p style={{ marginTop: '16px', color: 'var(--erp-text-muted)' }}>Loading audit logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', color: 'var(--erp-text-muted)' }}>
              No audit logs found. Try adjusting your filter or search.
            </div>
          ) : (
            <div className="erp-table-wrapper" style={{ border: 0, borderRadius: 0, boxShadow: 'none' }}>
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
                          <span className="erp-badge erp-badge--draft" style={{ fontSize: '0.72rem' }}>
                            {log.users?.role || 'SYSTEM'}
                          </span>
                        </td>
                        <td>
                          <span className={getModuleBadgeClass(log.module)}>
                            {log.module}
                          </span>
                        </td>
                        <td style={{ color: 'var(--erp-text)', fontWeight: 500 }}>
                          {log.action}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.86rem', color: 'var(--erp-text-muted)' }}>
                          {log.ip_address || '127.0.0.1'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="erp-button erp-button--secondary" 
                            style={{ padding: '6px 12px', height: 'auto', fontSize: '0.8rem', borderRadius: '8px' }}
                            onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                          >
                            {expandedLogId === log.id ? 'Hide' : 'Inspect'}
                          </button>
                        </td>
                      </tr>
                      {expandedLogId === log.id && (
                        <tr>
                          <td colSpan={7} style={{ background: '#f8fafc', padding: '16px 24px' }}>
                            <div style={{ display: 'grid', gap: '8px' }}>
                              <div style={{ fontSize: '0.82rem', color: 'var(--erp-text-muted)' }}>
                                <strong>Log ID:</strong> {log.id}
                              </div>
                              {log.entity_id && (
                                <div style={{ fontSize: '0.82rem', color: 'var(--erp-text-muted)' }}>
                                  <strong>Linked Entity ID:</strong> {log.entity_id}
                                </div>
                              )}
                              <div>
                                <strong style={{ fontSize: '0.82rem', color: 'var(--erp-text-muted)' }}>Log Metadata Parameters:</strong>
                                <pre style={{
                                  background: '#0f172a',
                                  color: '#38bdf8',
                                  padding: '12px',
                                  borderRadius: '10px',
                                  fontSize: '0.82rem',
                                  fontFamily: 'monospace',
                                  marginTop: '6px',
                                  overflowX: 'auto'
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
          <span style={{ fontSize: '0.92rem', color: 'var(--erp-text-muted)' }}>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="erp-button erp-button--secondary" 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(p - 1, 1))}
            >
              Previous
            </button>
            <button 
              className="erp-button erp-button--secondary" 
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

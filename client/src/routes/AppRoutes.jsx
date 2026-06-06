import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PublicOnlyRoute from './PublicOnlyRoute';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import DashboardPage from '../pages/DashboardPage';
import VendorsPage from '../pages/VendorsPage';
import ProcurementPage from '../pages/ProcurementPage';
import InvoicesPage from '../pages/InvoicesPage';
import ReportsPage from '../pages/ReportsPage';
import SettingsPage from '../pages/SettingsPage';
import VendorManagementPage from '../pages/VendorManagementPage';
import RfqManagementPage from '../pages/RfqManagementPage';
import VendorPortalPage from '../pages/VendorPortalPage';
import QuotationComparisonPage from '../pages/QuotationComparisonPage';
import ApprovalWorkflowPage from '../pages/ApprovalWorkflowPage';
import PurchaseOrdersPage from '../pages/PurchaseOrdersPage';
import ActivityLogsPage from '../pages/ActivityLogsPage';
import ProfilePage from '../pages/ProfilePage';
import UserManagementPage from '../pages/UserManagementPage';
import { useAuth } from '../context/AuthContext';

const RoleAwareRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'vendor' ? '/vendor-portal' : '/dashboard'} replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<ProtectedRoute><RoleAwareRedirect /></ProtectedRoute>} />
    <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'procurement_officer', 'manager']}><DashboardPage /></ProtectedRoute>} />
    
    {/* Vendor directories */}
    <Route path="/vendors" element={<ProtectedRoute allowedRoles={['admin', 'procurement_officer', 'manager']}><VendorManagementPage /></ProtectedRoute>} />
    <Route path="/vendor-directory" element={<ProtectedRoute allowedRoles={['admin', 'procurement_officer', 'manager']}><VendorsPage /></ProtectedRoute>} />
    
    {/* RFQ & Procurement */}
    <Route path="/rfqs" element={<ProtectedRoute allowedRoles={['admin', 'procurement_officer']}><RfqManagementPage /></ProtectedRoute>} />
    <Route path="/procurement" element={<ProtectedRoute allowedRoles={['admin', 'procurement_officer']}><ProcurementPage /></ProtectedRoute>} />
    <Route path="/vendor-portal" element={<ProtectedRoute allowedRoles={['vendor']}><VendorPortalPage /></ProtectedRoute>} />
    <Route path="/compare" element={<ProtectedRoute allowedRoles={['admin', 'procurement_officer', 'manager']}><QuotationComparisonPage /></ProtectedRoute>} />
    <Route path="/compare/:rfqId" element={<ProtectedRoute allowedRoles={['admin', 'procurement_officer', 'manager']}><QuotationComparisonPage /></ProtectedRoute>} />
    
    {/* Workflow Approvals */}
    <Route path="/approvals" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ApprovalWorkflowPage /></ProtectedRoute>} />
    
    {/* Billing & System admin */}
    <Route path="/purchase-orders" element={<ProtectedRoute allowedRoles={['admin', 'procurement_officer', 'manager', 'vendor']}><PurchaseOrdersPage /></ProtectedRoute>} />
    <Route path="/invoices" element={<ProtectedRoute allowedRoles={['admin', 'procurement_officer', 'manager']}><InvoicesPage /></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ReportsPage /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} />
    <Route path="/activity-logs" element={<ProtectedRoute allowedRoles={['admin']}><ActivityLogsPage /></ProtectedRoute>} />
    <Route path="/user-management" element={<ProtectedRoute allowedRoles={['admin']}><UserManagementPage /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
    
    {/* Auth routes */}
    <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
    <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
    <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
    <Route path="/reset-password" element={<PublicOnlyRoute><ResetPasswordPage /></PublicOnlyRoute>} />
    
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;
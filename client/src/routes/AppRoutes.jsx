import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PublicOnlyRoute from './PublicOnlyRoute';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import DashboardPage from '../pages/DashboardPage';
import VendorManagementPage from '../pages/VendorManagementPage';
import RfqManagementPage from '../pages/RfqManagementPage';
import VendorPortalPage from '../pages/VendorPortalPage';
import { useAuth } from '../context/AuthContext';

const RoleAwareRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'vendor' ? '/vendor-portal' : '/dashboard'} replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<ProtectedRoute><RoleAwareRedirect /></ProtectedRoute>} />
    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
    <Route path="/vendors" element={<ProtectedRoute><VendorManagementPage /></ProtectedRoute>} />
    <Route path="/rfqs" element={<ProtectedRoute><RfqManagementPage /></ProtectedRoute>} />
    <Route path="/vendor-portal" element={<ProtectedRoute><VendorPortalPage /></ProtectedRoute>} />
    <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
    <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
    <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
    <Route path="/reset-password" element={<PublicOnlyRoute><ResetPasswordPage /></PublicOnlyRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;
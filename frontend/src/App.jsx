import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DocumentsPage from './pages/DocumentsPage'
import DocumentCreatePage from './pages/DocumentCreatePage'
import DocumentViewPage from './pages/DocumentViewPage'
import DocumentEditPage from './pages/DocumentEditPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AuditLogsPage from './pages/AuditLogsPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import WebAuthnSetupPage from './pages/WebAuthnSetupPage'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm font-semibold">Loading HyperVault…</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <Layout>{children}</Layout>
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/dashboard" element={
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      } />
      <Route path="/documents" element={
        <ProtectedRoute><DocumentsPage /></ProtectedRoute>
      } />
      <Route path="/documents/create" element={
        <ProtectedRoute><DocumentCreatePage /></ProtectedRoute>
      } />
      <Route path="/documents/:id" element={
        <ProtectedRoute><DocumentViewPage /></ProtectedRoute>
      } />
      <Route path="/documents/:id/edit" element={
        <ProtectedRoute><DocumentEditPage /></ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute allowedRoles={['super_admin']}><AdminUsersPage /></ProtectedRoute>
      } />
      <Route path="/audit/logs" element={
        <ProtectedRoute allowedRoles={['super_admin']}><AuditLogsPage /></ProtectedRoute>
      } />
      <Route path="/change-password" element={
        <ProtectedRoute><ChangePasswordPage /></ProtectedRoute>
      } />
      <Route path="/security" element={
        <ProtectedRoute><WebAuthnSetupPage /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

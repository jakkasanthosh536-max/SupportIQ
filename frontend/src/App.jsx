import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MainLayout } from './layouts/MainLayout';

// Code-split pages for instant initial load and small bundle size
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ChatPage = lazy(() => import('./pages/ChatPage').then(m => ({ default: m.ChatPage })));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage').then(m => ({ default: m.KnowledgeBasePage })));
const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage').then(m => ({ default: m.ArticleDetailPage })));
const DocumentUploadPage = lazy(() => import('./pages/DocumentUploadPage').then(m => ({ default: m.DocumentUploadPage })));
const SmartSearchPage = lazy(() => import('./pages/SmartSearchPage').then(m => ({ default: m.SmartSearchPage })));
const AgentWorkspacePage = lazy(() => import('./pages/AgentWorkspacePage').then(m => ({ default: m.AgentWorkspacePage })));
const KnowledgeGapsPage = lazy(() => import('./pages/KnowledgeGapsPage').then(m => ({ default: m.KnowledgeGapsPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

// Loading Spinner Fallback for Lazy-Loaded Routes
const PageLoadingFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
      <span className="text-xs font-medium text-slate-400">Loading module...</span>
    </div>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Role Protected Route Wrapper
const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* Public Landing & Login */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Application Workspace */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<AdminDashboard />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/knowledge" element={<KnowledgeBasePage />} />
              <Route path="/knowledge/:idOrSlug" element={<ArticleDetailPage />} />
              <Route
                path="/documents"
                element={
                  <RoleProtectedRoute allowedRoles={['admin', 'agent']}>
                    <DocumentUploadPage />
                  </RoleProtectedRoute>
                }
              />
              <Route path="/search" element={<SmartSearchPage />} />
              <Route path="/tickets" element={<AgentWorkspacePage />} />
              <Route
                path="/gaps"
                element={
                  <RoleProtectedRoute allowedRoles={['admin', 'agent']}>
                    <KnowledgeGapsPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <RoleProtectedRoute allowedRoles={['admin', 'agent']}>
                    <AnalyticsPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <RoleProtectedRoute allowedRoles={['admin']}>
                    <SettingsPage />
                  </RoleProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

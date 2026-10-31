import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MainLayout } from './layouts/MainLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { ChatPage } from './pages/ChatPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { ArticleDetailPage } from './pages/ArticleDetailPage';
import { DocumentUploadPage } from './pages/DocumentUploadPage';
import { SmartSearchPage } from './pages/SmartSearchPage';
import { AgentWorkspacePage } from './pages/AgentWorkspacePage';
import { KnowledgeGapsPage } from './pages/KnowledgeGapsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import {
  ArticleModal,
  ChunkInspectorModal,
  CreateFAQFromGapModal,
  DemoWalkthroughBar,
  EscalateModal,
  EvidenceDrawer,
} from './components';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  return <>{children}</>;
};

// Role Protected Route Wrapper
const RoleProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({
  children,
  allowedRoles,
}) => {
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

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

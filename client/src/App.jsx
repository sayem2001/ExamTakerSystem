import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ExamLobby from './pages/ExamLobby';
import ExamWorkspace from './pages/ExamWorkspace';
import ExamResults from './pages/ExamResults';
import LeaderboardView from './pages/LeaderboardView';
import StudentPracticeAi from './pages/StudentPracticeAi';
import Settings from './pages/Settings';
import NoticeBoard from './pages/NoticeBoard';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminExams from './pages/admin/AdminExams';
import AdminAiPdfImport from './pages/admin/AdminAiPdfImport';
import AdminQuestionBank from './pages/admin/AdminQuestionBank';
import AdminSubmissions from './pages/admin/AdminSubmissions';
import AdminSettings from './pages/admin/AdminSettings';
import AdminNotices from './pages/admin/AdminNotices';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: '#94a3b8' }}>Authenticating session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Admin Route Guard
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: '#94a3b8' }}>Checking permissions...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const LayoutContainer = ({ children }) => {
  const location = useLocation();
  const isWorkspace = location.pathname.startsWith('/workspace/');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {!isWorkspace && <Navbar />}
      <div style={{ flex: 1 }}>{children}</div>
      {!isWorkspace && <Footer />}
    </div>
  );
};

export const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <LayoutContainer>
            <Routes>
            {/* Public / Candidate Accessible */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/notices" element={<NoticeBoard />} />
            <Route path="/exam/:identifier" element={<ExamLobby />} />
            <Route path="/leaderboard" element={<LeaderboardView />} />
            <Route path="/leaderboard/exam/:examId" element={<LeaderboardView />} />

            {/* Protected Candidate Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/practice/ai"
              element={
                <ProtectedRoute>
                  <StudentPracticeAi />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspace/:examId"
              element={
                <ProtectedRoute>
                  <ExamWorkspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results/:attemptId"
              element={
                <ProtectedRoute>
                  <ExamResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Admin Exclusive Routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/exams"
              element={
                <AdminRoute>
                  <AdminExams />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/notices"
              element={
                <AdminRoute>
                  <AdminNotices />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/ai-import"
              element={
                <AdminRoute>
                  <AdminAiPdfImport />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/questions"
              element={
                <AdminRoute>
                  <AdminQuestionBank />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/submissions"
              element={
                <AdminRoute>
                  <AdminSubmissions />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AdminRoute>
                  <AdminSettings />
                </AdminRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </LayoutContainer>
      </Router>
    </AuthProvider>
  </ThemeProvider>
  );
};

export default App;

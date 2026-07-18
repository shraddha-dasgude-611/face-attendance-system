// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

import Login from './pages/Login';
import TeacherRegister from './pages/TeacherRegister';
import TeacherDashboard from './pages/TeacherDashboard';
import TakeAttendance from './pages/TakeAttendance';
import StudentRegister from './pages/StudentRegister';
import StudentDashboard from './pages/StudentDashboard';
import Students from './pages/Students';
import Reports from './pages/Reports';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const AppLayout = ({ children }) => (
  <div className="flex min-h-screen bg-gray-50">
    <Navbar />
    <main className="flex-1 overflow-auto">{children}</main>
  </div>
);

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes — no login needed */}
      <Route path="/login" element={<Login />} />
      <Route path="/teacher-register" element={<TeacherRegister />} />

      {/* Root redirect based on role */}
      <Route path="/" element={
        user
          ? <Navigate to={user.role === 'student' ? '/student-dashboard' : '/teacher-dashboard'} replace />
          : <Navigate to="/login" replace />
      } />

      {/* Teacher / Admin routes */}
      <Route path="/teacher-dashboard" element={
        <ProtectedRoute allowedRoles={['teacher', 'admin']}>
          <AppLayout><TeacherDashboard /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/take-attendance" element={
        <ProtectedRoute allowedRoles={['teacher', 'admin']}>
          <AppLayout><TakeAttendance /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/register-student" element={
        <ProtectedRoute allowedRoles={['teacher', 'admin']}>
          <AppLayout><StudentRegister /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/students" element={
        <ProtectedRoute allowedRoles={['teacher', 'admin']}>
          <AppLayout><Students /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/reports" element={
        <ProtectedRoute allowedRoles={['teacher', 'admin']}>
          <AppLayout><Reports /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Student routes */}
      <Route path="/student-dashboard" element={
        <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
          <AppLayout><StudentDashboard /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Catch all unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{ duration: 3000 }}
        />
      </Router>
    </AuthProvider>
  );
}
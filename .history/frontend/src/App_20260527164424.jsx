// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import TakeAttendance from './pages/TakeAttendance';
import StudentRegister from './pages/StudentRegister';
import TeacherRegister from './pages/TeacherRegister';
import Reports from './pages/Reports';
import Students from './pages/Students';
import StudentDashboard from './pages/StudentDashboard';
// Protected route wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

// Layout with sidebar
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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<StudentRegister />} />
      <Route path="/" element={
        user ? <Navigate to={user.role === 'student' ? '/student-dashboard' : '/teacher-dashboard'} /> : <Navigate to="/login" />
      } />
      <Route path="/teacher-register" element={<TeacherRegister />} />
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
      <Route path="/reports" element={
  <ProtectedRoute allowedRoles={['teacher', 'admin']}>
    <AppLayout><Reports /></AppLayout>
  </ProtectedRoute>
} />
    </Routes>
    
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster position="top-right" />
      </Router>
    </AuthProvider>
  );
}
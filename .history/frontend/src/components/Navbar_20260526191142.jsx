// src/components/Navbar.jsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) =>
    location.pathname === path ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50';

  const teacherLinks = [
    { to: '/teacher-dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/take-attendance', label: 'Take Attendance', icon: '📷' },
    { to: '/register-student', label: 'Register Student', icon: '➕' },
    { to: '/students', label: 'Students', icon: '👥' },
    { to: '/reports', label: 'Reports', icon: '📊' },
  ];

  const studentLinks = [
    { to: '/student-dashboard', label: 'My Dashboard', icon: '🏠' },
    { to: '/my-attendance', label: 'My Attendance', icon: '📅' },
  ];

  const links = user?.role === 'student' ? studentLinks : teacherLinks;

  return (
    <div className="w-64 bg-white border-r border-gray-100 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-xl">🎓</span>
          </div>
          <div>
            <p className="font-bold text-gray-900">AttendAI</p>
            <p className="text-xs text-gray-400">Face Recognition</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive(link.to)}`}
          >
            <span>{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold text-blue-600">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          🚪 Sign Out
        </button>
      </div>
    </div>
  );
}
// src/pages/StudentDashboard.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({
    present: 0, absent: 0, late: 0, total: 0, percentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Find student record by email
        const { data: sData } = await axios.get(`/api/students?search=${user.email}`);
        if (sData.students.length === 0) {
          setLoading(false);
          return;
        }
        const id = sData.students[0]._id;
        setStudentId(id);

        // Fetch their attendance
        const { data: aData } = await axios.get(`/api/attendance/student/${id}`);
        setAttendance(aData.attendance);
        setStats(aData.stats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

  const getStatusColor = (status) => {
    if (status === 'present') return 'bg-green-100 text-green-700';
    if (status === 'absent')  return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500">Loading your attendance...</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Attendance</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.name} 👋</p>
      </div>

      {/* Big attendance % card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 font-medium mb-1">Overall Attendance</p>
            <p className="text-6xl font-bold">{stats.percentage}%</p>
            <p className="text-blue-100 text-sm mt-2">
              {stats.present} present out of {stats.total} total classes
            </p>
          </div>

          {/* Circular progress */}
          <div className="w-28 h-28">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="10"
              />
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke="white"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40 * stats.percentage / 100} ${2 * Math.PI * 40}`}
              />
            </svg>
          </div>
        </div>

        {/* Low attendance warning */}
        {stats.percentage < 75 && stats.total > 0 && (
          <div className="mt-4 bg-red-500 bg-opacity-40 border border-red-300 rounded-xl p-3 text-sm">
            ⚠️ Your attendance is below 75%! You need{' '}
            <strong>
              {Math.max(0, Math.ceil((0.75 * stats.total - stats.present) / 0.25))}
            </strong>{' '}
            more classes to reach 75%.
          </div>
        )}

        {stats.percentage >= 75 && stats.total > 0 && (
          <div className="mt-4 bg-green-500 bg-opacity-30 border border-green-300 rounded-xl p-3 text-sm">
            ✅ Great! Your attendance is above 75%. Keep it up!
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
          <p className="text-sm text-gray-500 mb-1">Present</p>
          <p className="text-3xl font-bold text-green-600">{stats.present}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
          <p className="text-sm text-gray-500 mb-1">Absent</p>
          <p className="text-3xl font-bold text-red-500">{stats.absent}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-5">
          <p className="text-sm text-gray-500 mb-1">Late</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.late}</p>
        </div>
      </div>

      {/* Attendance history table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Attendance History</h3>
        </div>

        {!studentId ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-5xl mb-3">🎓</p>
            <p className="font-medium">No student record found</p>
            <p className="text-sm mt-1">Ask your teacher to register you in the system</p>
          </div>
        ) : attendance.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-5xl mb-3">📅</p>
            <p className="font-medium">No attendance records yet</p>
            <p className="text-sm mt-1">Your attendance will appear here once marked</p>
          </div>
        ) : (
          <div className="
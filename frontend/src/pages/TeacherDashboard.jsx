// src/pages/TeacherDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function TeacherDashboard() {
  const [stats, setStats] = useState({ totalStudents: 0, todayPresent: 0, todayAbsent: 0 });
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, attendanceRes] = await Promise.all([
          axios.get('/api/students'),
          axios.get('/api/attendance/today')
        ]);
        const students = studentsRes.data.students;
        const attendance = attendanceRes.data.attendance;
        const presentCount = attendance.filter(a => a.status === 'present').length;

        setStats({
          totalStudents: students.length,
          todayPresent: presentCount,
          todayAbsent: Math.max(0, students.length - presentCount)
        });
        setTodayAttendance(attendance.slice(0, 10));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const StatCard = ({ title, value, icon, color }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{loading ? '...' : value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const QuickAction = ({ to, icon, title, desc, color }) => (
    <Link to={to} className={`${color} rounded-2xl p-6 text-white hover:opacity-90 transition-opacity block`}>
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-sm opacity-80 mt-1">{desc}</p>
    </Link>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="text-gray-500 mt-1">Today: {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Students" value={stats.totalStudents} icon="👥" color="bg-blue-50" />
        <StatCard title="Present Today" value={stats.todayPresent} icon="✅" color="bg-green-50" />
        <StatCard title="Absent Today" value={stats.todayAbsent} icon="❌" color="bg-red-50" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <QuickAction to="/take-attendance" icon="📷" title="Take Attendance" desc="AI face recognition scan" color="bg-blue-600" />
        <QuickAction to="/register-student" icon="➕" title="Register Student" desc="Add student with face data" color="bg-purple-600" />
        <QuickAction to="/reports" icon="📊" title="View Reports" desc="Analytics and attendance data" color="bg-emerald-600" />
      </div>

      {/* Today's Attendance */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Attendance Today</h3>
        </div>
        <div className="overflow-auto">
          {todayAttendance.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No attendance taken today</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="px-6 py-4 text-left">Student</th>
                  <th className="px-6 py-4 text-left">Roll No.</th>
                  <th className="px-6 py-4 text-left">Subject</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Method</th>
                  <th className="px-6 py-4 text-left">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {todayAttendance.map(a => (
                  <tr key={a._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{a.student?.name}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{a.student?.rollNumber}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{a.subject}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        a.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        a.markedBy === 'face_recognition' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {a.markedBy === 'face_recognition' ? '🤖 AI' : '✋ Manual'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {new Date(a.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
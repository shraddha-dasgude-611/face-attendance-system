// src/pages/Reports.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

export default function Reports() {
  const [report, setReport]   = useState([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/attendance/report');
      setReport(data.report);
    } catch (err) {
      console.error('Report error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchReport();
  }, [fetchReport]);

  const totalStudents  = report.length;
  const avgAttendance  = totalStudents > 0
    ? Math.round(report.reduce((s, r) => s + r.percentage, 0) / totalStudents)
    : 0;
  const goodAttendance = report.filter(r => r.percentage >= 75).length;
  const lowAttendance  = report.filter(r => r.percentage <  75).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Report</h1>
          <p className="text-gray-500 mt-1">All your registered students</p>
        </div>
        <button
          onClick={fetchReport}
          disabled={loading}
          className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
          ) : '🔄'} Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Students', value: totalStudents,       bg: 'bg-blue-50   border-blue-100',   text: 'text-blue-700'   },
          { label: 'Avg Attendance', value: `${avgAttendance}%`, bg: 'bg-purple-50 border-purple-100', text: 'text-purple-700' },
          { label: 'Above 75%',      value: goodAttendance,      bg: 'bg-green-50  border-green-100',  text: 'text-green-700'  },
          { label: 'Below 75%',      value: lowAttendance,       bg: 'bg-red-50    border-red-100',    text: 'text-red-700'    },
        ].map(card => (
          <div key={card.label} className={`${card.bg} border rounded-2xl p-5`}>
            <p className="text-sm text-gray-500 mb-1">{card.label}</p>
            <p className={`text-3xl font-bold ${card.text}`}>
              {loading ? '...' : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">
            Student Attendance Summary
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-400">Loading report...</p>
          </div>
        ) : report.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-5xl mb-3">📋</p>
            <p className="font-medium text-gray-600">No students registered yet</p>
            <p className="text-sm mt-1">Register students first, then take attendance</p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="px-6 py-4 text-left">Student Name</th>
                  <th className="px-6 py-4 text-left">Roll No.</th>
                  <th className="px-6 py-4 text-center">Year</th>
                  <th className="px-6 py-4 text-center">Present</th>
                  <th className="px-6 py-4 text-center">Absent</th>
                  <th className="px-6 py-4 text-center">Total Classes</th>
                  <th className="px-6 py-4 text-left">Attendance %</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.map(row => (
                  <tr key={row._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {row.studentName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                      {row.rollNumber}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-500">
                      Year {row.year}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-green-600 text-lg">
                        {row.present}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-red-500 text-lg">
                        {row.absent}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">
                      {row.totalClasses === 0 ? (
                        <span className="text-gray-300 text-sm">No classes yet</span>
                      ) : row.totalClasses}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-100 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all ${
                              row.percentage >= 75 ? 'bg-green-500' :
                              row.percentage >= 50 ? 'bg-yellow-500' :
                              row.totalClasses === 0 ? 'bg-gray-300' : 'bg-red-500'
                            }`}
                            style={{ width: `${row.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-700 min-w-[40px]">
                          {row.totalClasses === 0 ? '—' : `${row.percentage}%`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.totalClasses === 0 ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                          No Data
                        </span>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          row.percentage >= 75
                            ? 'bg-green-100 text-green-700'
                            : row.percentage >= 50
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {row.percentage >= 75 ? '✅ Good' :
                           row.percentage >= 50 ? '⚠️ Low' : '❌ Critical'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Low attendance warning */}
      {!loading && report.filter(r => r.percentage < 75 && r.totalClasses > 0).length > 0 && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-5">
          <p className="font-semibold text-red-800 mb-3">
            ⚠️ Students Below 75% Attendance
          </p>
          <div className="flex flex-wrap gap-2">
            {report
              .filter(r => r.percentage < 75 && r.totalClasses > 0)
              .sort((a, b) => a.percentage - b.percentage)
              .map(r => (
                <span
                  key={r._id}
                  className="bg-white border border-red-200 text-red-700 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {r.studentName} — {r.percentage}%
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
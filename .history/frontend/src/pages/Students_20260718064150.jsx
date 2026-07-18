// src/pages/Students.jsx
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  const fetchStudents = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/students${q ? `?search=${q}` : ''}`);
      setStudents(data.students);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ No hasFetched ref — fetches fresh every time page is visited
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    fetchStudents(e.target.value);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove ${name}?`)) return;
    try {
      await axios.delete(`/api/students/${id}`);
      toast.success(`${name} removed`);
      fetchStudents(search);
    } catch {
      toast.error('Failed to remove student');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Students</h1>
      <p className="text-gray-500 mb-6">Your registered students</p>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="🔍  Search by name, roll number or email..."
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">All Students</h3>
          <span className="bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full">
            {students.length} registered
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-400">Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-5xl mb-3">👥</p>
            <p className="font-medium text-gray-600">No students registered yet</p>
            <p className="text-sm mt-1">Use "Register Student" in the sidebar to add students</p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="px-6 py-4 text-left">Student</th>
                  <th className="px-6 py-4 text-left">Roll No.</th>
                  <th className="px-6 py-4 text-center">Year</th>
                  <th className="px-6 py-4 text-left">Face Data</th>
                  <th className="px-6 py-4 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map(s => (
                  <tr key={s._id} className="hover:bg-gray-50">

                    {/* Name + Email */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-blue-600">
                            {s.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Roll No */}
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                      {s.rollNumber}
                    </td>

                    {/* Year */}
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      Year {s.year}
                    </td>

                    {/* Face Data */}
                    <td className="px-6 py-4">
                      {s.faceDescriptorCount > 0 ? (
                        <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
                          ✅ {s.faceDescriptorCount} samples
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-600 text-xs font-medium px-3 py-1 rounded-full">
                          ❌ No face data
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(s._id, s.name)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
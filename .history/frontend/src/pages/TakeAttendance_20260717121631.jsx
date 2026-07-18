// src/pages/TakeAttendance.jsx
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as faceapi from '@vladmandic/face-api';
import { loadFaceAPIModels, buildLabeledDescriptors, findBestMatch } from '../utils/faceApi';
import { useAuth } from '../context/AuthContext';

export default function TakeAttendance() {
  const { user } = useAuth();
  const [subject, setSubject]               = useState('');
  const [classRoom, setClassRoom]           = useState('');
  const [semester, setSemester]             = useState('');
  const [isScanning, setIsScanning]         = useState(false);
  const [modelsLoaded, setModelsLoaded]     = useState(false);
  const [allStudents, setAllStudents]       = useState([]);
  const [labeledDescriptors, setLabeledDescriptors] = useState([]);
  const [markedAttendance, setMarkedAttendance]     = useState([]);
  const [status, setStatus]                 = useState('Initializing...');
  const [detectionCount, setDetectionCount] = useState(0);

  const videoRef       = useRef(null);
  const canvasRef      = useRef(null);
  const streamRef      = useRef(null);
  const intervalRef    = useRef(null);
  const markedSetRef   = useRef(new Set());
  const isRunningRef   = useRef(false);

  // Refs to avoid stale closures inside interval
  const subjectRef      = useRef('');
  const classRoomRef    = useRef('');
  const semesterRef     = useRef('');
  const studentsRef     = useRef([]);
  const labeledRef      = useRef([]);
  const allStudentsRef  = useRef([]);

  useEffect(() => { subjectRef.current    = subject;   }, [subject]);
  useEffect(() => { classRoomRef.current  = classRoom; }, [classRoom]);
  useEffect(() => { semesterRef.current   = semester;  }, [semester]);
  useEffect(() => { labeledRef.current    = labeledDescriptors; }, [labeledDescriptors]);
  useEffect(() => { allStudentsRef.current = allStudents; }, [allStudents]);

  // ─── 1. stopCamera ───────────────────────────────────────────────
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  // ─── 2. markAbsentStudents ───────────────────────────────────────
  const markAbsentStudents = async (presentIds, subjectVal) => {
    const absentStudents = allStudentsRef.current.filter(
      s => !presentIds.has(s._id)
    );
    if (absentStudents.length === 0) return;

    console.log('📋 Marking absent:', absentStudents.map(s => s.name));

    for (const student of absentStudents) {
      try {
        await axios.post('/api/attendance/mark', {
          studentId:  student._id,
          subject:    subjectVal,
          status:     'absent',
          confidence: null,
          classRoom:  classRoomRef.current,
          semester:   semesterRef.current
        });
        console.log('❌ Absent:', student.name);
      } catch (err) {
        if (err.response?.status !== 409) {
          console.error('Failed to mark absent:', student.name);
        }
      }
    }

    toast(`📋 ${absentStudents.length} student(s) marked absent`, {
      icon: '📋',
      duration: 3000
    });
  };

  // ─── 3. stopScanning ─────────────────────────────────────────────
  const stopScanning = async () => {
    isRunningRef.current = false;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (subjectRef.current) {
      await markAbsentStudents(markedSetRef.current, subjectRef.current);
    }

    stopCamera();
    setIsScanning(false);
    setDetectionCount(0);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // ─── 4. useEffect — init + cleanup ───────────────────────────────
  useEffect(() => {
    const init = async () => {
      setStatus('Loading AI models...');
      const loaded = await loadFaceAPIModels();
      setModelsLoaded(loaded);
      if (!loaded) { setStatus('❌ Failed to load AI models'); return; }

      setStatus('Fetching student data...');
      try {
        const [deptRes, faceRes] = await Promise.all([
          axios.get('/api/students'),
          axios.get('/api/students/with-descriptors')
        ]);

        setAllStudents(deptRes.data.students);
        allStudentsRef.current = deptRes.data.students;

        const labeled = buildLabeledDescriptors(faceRes.data.students);
        setLabeledDescriptors(labeled);
        labeledRef.current  = labeled;
        studentsRef.current = faceRes.data.students;

        setStatus(
          `✅ Ready — ${deptRes.data.students.length} students in your department`
        );
      } catch {
        setStatus('❌ Could not load student data');
      }
    };

    init();
    return () => { stopScanning(); };
  }, []);

  // ─── 5. startCamera ──────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      });
      const video = videoRef.current;
      video.srcObject  = stream;
      streamRef.current = stream;
      await new Promise(resolve => {
        video.onloadedmetadata = () =>
          video.play().then(() => setTimeout(resolve, 500));
      });
      return true;
    } catch {
      toast.error('Camera access denied');
      return false;
    }
  };

  // ─── 6. markAttendanceForStudent ─────────────────────────────────
  const markAttendanceForStudent = async (
    student, confidence, subjectVal, classRoomVal, semesterVal
  ) => {
    try {
      await axios.post('/api/attendance/mark', {
        studentId: student._id,
        subject:   subjectVal,
        confidence,
        classRoom: classRoomVal,
        semester:  semesterVal,
        status:    'present'
      });

      setMarkedAttendance(prev => [...prev, {
        id:         student._id,
        name:       student.name,
        rollNumber: student.rollNumber,
        confidence: Math.round(confidence * 100),
        time:       new Date().toLocaleTimeString()
      }]);

      toast.success(`✅ ${student.name} marked present!`, { duration: 2500 });

    } catch (err) {
      if (err.response?.status === 409) {
        setMarkedAttendance(prev =>
          prev.find(a => a.id === student._id)
            ? prev
            : [...prev, {
                id:         student._id,
                name:       student.name,
                rollNumber: student.rollNumber,
                confidence: Math.round(confidence * 100),
                time:       new Date().toLocaleTimeString()
              }]
        );
      } else {
        toast.error(`Failed: ${err.response?.data?.message || 'Unknown error'}`);
      }
    }
  };

  // ─── 7. runDetection ─────────────────────────────────────────────
  const runDetection = async () => {
    if (!isRunningRef.current) return;

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.readyState !== 4) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    try {
      if (canvas.width  !== video.videoWidth)  canvas.width  = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 416, scoreThreshold: 0.4
      });

      const detections = await faceapi
        .detectAllFaces(video, options)
        .withFaceLandmarks()
        .withFaceDescriptors();

      setDetectionCount(detections.length);

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (detections.length === 0) return;

      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      const resized     = faceapi.resizeResults(detections, displaySize);

      resized.forEach(detection => {
        const box   = detection.detection.box;
        const match = labeledRef.current.length > 0
          ? findBestMatch(detection.descriptor, labeledRef.current)
          : null;

        const isKnown = match !== null;
        const color   = isKnown ? '#22c55e' : '#ef4444';

        ctx.strokeStyle = color;
        ctx.lineWidth   = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        const student = isKnown
          ? studentsRef.current.find(s => s._id === match.label)
          : null;

        const label = student
          ? `${student.name} ${Math.round(match.confidence * 100)}%`
          : 'Unknown';

        ctx.font = 'bold 15px Inter, sans-serif';
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = color;
        ctx.fillRect(box.x, box.y - 30, tw + 14, 28);
        ctx.fillStyle = 'white';
        ctx.fillText(label, box.x + 7, box.y - 9);

        if (isKnown && student && !markedSetRef.current.has(match.label)) {
          markedSetRef.current.add(match.label);
          markAttendanceForStudent(
            student, match.confidence,
            subjectRef.current, classRoomRef.current, semesterRef.current
          );
        }
      });

    } catch (err) {
      console.warn('Frame skip:', err.message);
    }
  };

  // ─── 8. startScanning ────────────────────────────────────────────
  const startScanning = async () => {
    if (!subjectRef.current.trim()) {
      toast.error('Please select a subject first'); return;
    }
    if (!modelsLoaded) {
      toast.error('AI models not loaded yet'); return;
    }
    if (labeledRef.current.length === 0) {
      toast.error('No students with face data registered'); return;
    }

    setStatus('Starting camera...');
    const started = await startCamera();
    if (!started) return;

    markedSetRef.current = new Set();
    setMarkedAttendance([]);
    isRunningRef.current = true;
    setIsScanning(true);
    setStatus(`🔍 Scanning — Subject: ${subjectRef.current}`);
    intervalRef.current = setInterval(runDetection, 1500);
  };

  // ─── JSX ─────────────────────────────────────────────────────────
  const teacherSubjects = user?.subjects || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Take Attendance</h1>
      <p className="text-gray-500 mb-6">
        Department: <strong>{user?.department}</strong> &nbsp;|&nbsp;
        Subjects: <strong>{teacherSubjects.join(', ') || 'None set'}</strong>
      </p>

      {/* Config */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="grid grid-cols-3 gap-4 mb-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject *
            </label>
            {teacherSubjects.length > 0 ? (
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                disabled={isScanning}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50 bg-white"
              >
                <option value="">-- Select Subject --</option>
                {teacherSubjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                disabled={isScanning}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50"
                placeholder="e.g. Data Structures"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Classroom</label>
            <input
              type="text"
              value={classRoom}
              onChange={e => setClassRoom(e.target.value)}
              disabled={isScanning}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50"
              placeholder="Room 101"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <input
              type="text"
              value={semester}
              onChange={e => setSemester(e.target.value)}
              disabled={isScanning}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50"
              placeholder="Sem 3"
            />
          </div>
        </div>

        {/* Status bar */}
        <div className={`p-3 rounded-lg text-sm mb-4 ${
          status.includes('❌') ? 'bg-red-50 text-red-700' :
          status.includes('✅') ? 'bg-green-50 text-green-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {status}
        </div>

        {teacherSubjects.length === 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            ⚠️ No subjects in your profile. Please re-register and add your subjects.
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          {!isScanning ? (
            <button
              onClick={startScanning}
              disabled={!modelsLoaded || !subject}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📷 Start Face Scanning
            </button>
          ) : (
            <button
              onClick={stopScanning}
              className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
            >
              ⏹ Stop & Mark Absent
            </button>
          )}

          {isScanning && (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                {detectionCount} face{detectionCount !== 1 ? 's' : ''} in frame
              </div>
              <div className="text-sm text-orange-700 bg-orange-50 border border-orange-200 px-3 py-2 rounded-lg">
                ⏹ Click Stop to auto-mark remaining students absent
              </div>
            </>
          )}
        </div>
      </div>

      {/* Camera + Attendance log */}
      <div className="grid grid-cols-2 gap-6">

        {/* Camera feed */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Camera Feed</h3>
          </div>
          <div className="relative bg-gray-900" style={{ minHeight: 360 }}>
            <video
              ref={videoRef}
              autoPlay muted playsInline
              style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }}
              onLoadedMetadata={() => {
                const v = videoRef.current;
                const c = canvasRef.current;
                if (v && c) { c.width = v.videoWidth; c.height = v.videoHeight; }
              }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%',
                transform: 'scaleX(-1)'
              }}
            />
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                <span className="text-6xl mb-3">🎥</span>
                <p className="text-sm">Camera starts when scanning begins</p>
              </div>
            )}
          </div>
        </div>

        {/* Live attendance log */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Marked Present</h3>
            <div className="flex items-center gap-2">
              <span className="bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
                ✅ {markedAttendance.length} present
              </span>
              <span className="bg-red-100 text-red-700 text-sm font-medium px-3 py-1 rounded-full">
                ❌ {Math.max(0, allStudents.length - markedAttendance.length)} absent
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto" style={{ maxHeight: 360 }}>
            {markedAttendance.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-4xl mb-2">👥</p>
                <p className="text-sm">Recognised students appear here</p>
                <p className="text-xs mt-2 text-gray-300">
                  Total dept students: {allStudents.length}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Match %</th>
                    <th className="px-4 py-3 text-left">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {markedAttendance.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-sm">{a.name}</p>
                        <p className="text-xs text-gray-400">{a.rollNumber}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-14 bg-gray-100 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-green-500"
                              style={{ width: `${a.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600">
                            {a.confidence}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{a.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
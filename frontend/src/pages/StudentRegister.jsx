// src/pages/StudentRegister.jsx
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { loadFaceAPIModels, getSingleFaceDescriptor } from '../utils/faceApi';

export default function StudentRegister() {
  const [form, setForm] = useState({
    name: '', rollNumber: '', email: '', year: ''
  });
  const [step, setStep]                           = useState(1);
  const [capturedDescriptors, setCapturedDescriptors] = useState([]);
  const [captureCount, setCaptureCount]           = useState(0);
  const [loading, setLoading]                     = useState(false);
  const [modelsLoaded, setModelsLoaded]           = useState(false);
  const [cameraActive, setCameraActive]           = useState(false);
  const [captureMsg, setCaptureMsg]               = useState('');

  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const REQUIRED  = 5;

  useEffect(() => { return () => stopCamera(); }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      await videoRef.current.play();
      setCameraActive(true);

      if (!modelsLoaded) {
        setCaptureMsg('Loading AI models...');
        const loaded = await loadFaceAPIModels();
        setModelsLoaded(loaded);
        setCaptureMsg(loaded
          ? '✅ Ready! Position your face in frame'
          : '❌ Model loading failed');
      } else {
        setCaptureMsg('Ready! Position your face in frame');
      }
    } catch {
      toast.error('Camera access denied. Please allow camera permission.');
    }
  };

  const captureFace = async () => {
    if (!videoRef.current || !modelsLoaded) return;
    setCaptureMsg('Detecting face...');
    try {
      const detection = await getSingleFaceDescriptor(videoRef.current);
      if (!detection) {
        setCaptureMsg('❌ No face detected. Look directly at camera.');
        return;
      }
      const descriptor = Array.from(detection.descriptor);
      setCapturedDescriptors(prev => [...prev, descriptor]);
      const newCount = captureCount + 1;
      setCaptureCount(newCount);
      const tips = [
        'Now turn slightly left',
        'Now turn slightly right',
        'Tilt head up slightly',
        'Almost done!',
        'Last one!'
      ];
      setCaptureMsg(`✅ Captured ${newCount}/${REQUIRED} — ${tips[newCount - 1] || ''}`);
      if (newCount >= REQUIRED) {
        setCaptureMsg('✅ All captures complete! Click Register.');
      }
    } catch {
      setCaptureMsg('Error during detection. Try again.');
    }
  };

  const submitRegistration = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name',            form.name);
      formData.append('rollNumber',      form.rollNumber);
      formData.append('email',           form.email);
      formData.append('year',            form.year);
      formData.append('department',      '');
      formData.append('section',         '');
      formData.append('faceDescriptors', JSON.stringify(capturedDescriptors));

      await axios.post('/api/students', formData);
      toast.success(`${form.name} registered successfully!`);
      stopCamera();
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setForm({ name: '', rollNumber: '', email: '', year: '' });
    setCaptureCount(0);
    setCapturedDescriptors([]);
    setCaptureMsg('');
  };

  // ── Step 1: Info Form ─────────────────────────────────────────────
  if (step === 1) return (
    <div className="max-w-lg mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Register New Student</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number *</label>
            <input
              type="text"
              value={form.rollNumber}
              onChange={e => setForm({...form, rollNumber: e.target.value})}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="CS21001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="john@student.edu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
            <select
              value={form.year}
              onChange={e => setForm({...form, year: e.target.value})}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select Year</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            if (!form.name || !form.rollNumber || !form.email || !form.year) {
              toast.error('Please fill all fields');
              return;
            }
            setStep(2);
          }}
          className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Next: Capture Face →
        </button>
      </div>
    </div>
  );

  // ── Step 2: Face Capture ──────────────────────────────────────────
  if (step === 2) return (
    <div className="max-w-lg mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Capture Face</h2>
        <p className="text-gray-500 mb-6">
          Take <strong>{REQUIRED} photos</strong> of <strong>{form.name}</strong> from different angles
        </p>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span className="font-semibold">{captureCount}/{REQUIRED}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(captureCount / REQUIRED) * 100}%` }}
            />
          </div>
        </div>

        {/* Camera view */}
        <div className="relative rounded-2xl overflow-hidden bg-gray-900 mb-4" style={{ minHeight: 280 }}>
          <video
            ref={videoRef}
            className="w-full"
            style={{ transform: 'scaleX(-1)', display: 'block' }}
            autoPlay muted playsInline
          />
          {!cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-500 text-5xl">📷</span>
            </div>
          )}
          {cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-44 h-56 border-4 border-blue-400 rounded-full opacity-60" />
            </div>
          )}
        </div>

        {/* Status message */}
        {captureMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm text-center ${
            captureMsg.includes('❌')
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            {captureMsg}
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-3">
          {!cameraActive ? (
            <button
              onClick={startCamera}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              📷 Start Camera
            </button>
          ) : (
            <button
              onClick={captureFace}
              disabled={captureCount >= REQUIRED}
              className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📸 Capture Photo ({captureCount}/{REQUIRED})
            </button>
          )}

          {captureCount >= REQUIRED && (
            <button
              onClick={submitRegistration}
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Registering...
                </span>
              ) : '✅ Complete Registration'}
            </button>
          )}

          <button
            onClick={() => {
              stopCamera();
              setStep(1);
              setCaptureCount(0);
              setCapturedDescriptors([]);
              setCaptureMsg('');
            }}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );

  // ── Step 3: Success ───────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">✅</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Registered!</h2>
        <p className="text-gray-500 mb-1">{form.name} has been registered successfully.</p>
        <p className="text-sm text-gray-400">{captureCount} face samples captured.</p>
        <button
          onClick={resetForm}
          className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          ➕ Register Another Student
        </button>
      </div>
    </div>
  );
}
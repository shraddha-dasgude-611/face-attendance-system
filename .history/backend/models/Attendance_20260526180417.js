// backend/models/Attendance.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late'],
    default: 'present'
  },
  markedBy: {
    type: String,
    enum: ['face_recognition', 'manual'],
    default: 'face_recognition'
  },
  confidence: {
    type: Number,  // Face recognition confidence score 0-1
    min: 0,
    max: 1
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  classRoom: {
    type: String,
    trim: true
  },
  semester: {
    type: String,
    trim: true
  },
  // Prevent duplicate attendance for same student, subject, date
}, {
  timestamps: true
});

// Compound index to prevent duplicate attendance
attendanceSchema.index(
  { student: 1, subject: 1, date: 1 },
  { unique: true }
);

// Static method: Get attendance stats for a student
attendanceSchema.statics.getStudentStats = async function(studentId, subject = null) {
  const match = { student: mongoose.Types.ObjectId(studentId) };
  if (subject) match.subject = subject;

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = { present: 0, absent: 0, late: 0, total: 0 };
  stats.forEach(s => {
    result[s._id] = s.count;
    result.total += s.count;
  });
  result.percentage = result.total > 0
    ? Math.round((result.present / result.total) * 100)
    : 0;

  return result;
};

module.exports = mongoose.model('Attendance', attendanceSchema);
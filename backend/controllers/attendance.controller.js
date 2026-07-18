// backend/controllers/attendance.controller.js
const Attendance = require('../models/Attendance');
const Student    = require('../models/Student');
const mongoose   = require('mongoose');

// @route  POST /api/attendance/mark
exports.markAttendance = async (req, res) => {
  try {
    const { studentId, subject, status, confidence, classRoom, semester } = req.body;

    console.log('📥 Mark attendance:', { studentId, subject, status });

    if (!studentId || !subject) {
      return res.status(400).json({
        success: false,
        message: 'studentId and subject are required'
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Duplicate check
    const existing = await Attendance.findOne({
      student: studentId,
      subject,
      date: { $gte: today, $lt: tomorrow }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `${student.name} already marked for ${subject} today`,
        attendance: existing
      });
    }

    const attendance = new Attendance({
      student:    studentId,
      subject,
      status:     status || 'present',
      confidence: confidence !== undefined ? confidence : null,
      classRoom:  classRoom  || '',
      semester:   semester   || '',
      teacher:    req.user._id,
      markedBy:   confidence ? 'face_recognition' : 'manual',
      date:       new Date()
    });

    await attendance.save();
    await attendance.populate('student', 'name rollNumber');

    console.log('✅ Marked:', student.name, '-', subject, '-', status || 'present');
    return res.status(201).json({ success: true, attendance });

  } catch (error) {
    console.error('❌ MARK ATTENDANCE ERROR:', error.name, '-', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route  POST /api/attendance/bulk-mark
exports.bulkMarkAttendance = async (req, res) => {
  try {
    const { attendanceList, subject, classRoom, semester } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const results = { success: [], skipped: [], failed: [] };

    for (const item of attendanceList) {
      try {
        const existing = await Attendance.findOne({
          student: item.studentId,
          subject,
          date: { $gte: today, $lt: tomorrow }
        });

        if (existing) {
          results.skipped.push(item.studentId);
          continue;
        }

        await Attendance.create({
          student:    item.studentId,
          subject,
          status:     item.status     || 'present',
          confidence: item.confidence || null,
          classRoom:  classRoom       || '',
          semester:   semester        || '',
          teacher:    req.user._id,
          markedBy:   item.confidence ? 'face_recognition' : 'manual',
          date:       new Date()
        });

        results.success.push(item.studentId);
      } catch (e) {
        console.error('Bulk item error:', e.message);
        results.failed.push(item.studentId);
      }
    }

    return res.json({ success: true, results });

  } catch (error) {
    console.error('❌ BULK MARK ERROR:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route  GET /api/attendance/today
exports.getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.find({
      date:    { $gte: today, $lt: tomorrow },
      teacher: req.user._id
    })
      .populate('student', 'name rollNumber year email')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count:   attendance.length,
      attendance
    });

  } catch (error) {
    console.error('❌ TODAY ERROR:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route  GET /api/attendance/student/:studentId
exports.getStudentAttendance = async (req, res) => {
  try {
    const { subject, startDate, endDate } = req.query;
    const filter = { student: req.params.studentId };

    if (subject) filter.subject = subject;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate)   filter.date.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(filter).sort({ date: -1 });

    const stats = {
      present: attendance.filter(a => a.status === 'present').length,
      absent:  attendance.filter(a => a.status === 'absent').length,
      late:    attendance.filter(a => a.status === 'late').length,
      total:   attendance.length
    };
    stats.percentage = stats.total > 0
      ? Math.round((stats.present / stats.total) * 100)
      : 0;

    return res.json({ success: true, attendance, stats });

  } catch (error) {
    console.error('❌ STUDENT ATTENDANCE ERROR:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route  GET /api/attendance/report
// ✅ Shows all students registered by this teacher with their attendance
exports.getReport = async (req, res) => {
  try {
    // Get all students registered by this teacher
    const myStudents = await Student.find({
      isActive:     true,
      registeredBy: req.user._id
    }).select('_id name rollNumber year').lean();

    if (myStudents.length === 0) {
      return res.json({ success: true, report: [] });
    }

    const myStudentIds = myStudents.map(s => s._id);

    // Get attendance records for these students
    const attendanceRecords = await Attendance.aggregate([
      {
        $match: {
          student: { $in: myStudentIds }
        }
      },
      {
        $group: {
          _id:          '$student',
          totalClasses: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absent:  { $sum: { $cond: [{ $eq: ['$status', 'absent']  }, 1, 0] } },
          late:    { $sum: { $cond: [{ $eq: ['$status', 'late']    }, 1, 0] } }
        }
      }
    ]);

    // Map attendance to students
    const attendanceMap = {};
    attendanceRecords.forEach(r => {
      attendanceMap[r._id.toString()] = r;
    });

    // Build final report — include ALL students even if no attendance yet
    const report = myStudents.map(student => {
      const att = attendanceMap[student._id.toString()];
      const present      = att?.present      || 0;
      const absent       = att?.absent       || 0;
      const late         = att?.late         || 0;
      const totalClasses = att?.totalClasses || 0;
      const percentage   = totalClasses > 0
        ? Math.round((present / totalClasses) * 100)
        : 0;

      return {
        _id:          student._id,
        studentName:  student.name,
        rollNumber:   student.rollNumber,
        year:         student.year,
        present,
        absent,
        late,
        totalClasses,
        percentage
      };
    });

    // Sort by roll number
    report.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));

    console.log('📊 Report:', report.length, 'students');
    return res.json({ success: true, report });

  } catch (error) {
    console.error('❌ REPORT ERROR:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
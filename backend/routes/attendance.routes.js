// backend/routes/attendance.routes.js
const express = require('express');
const router = express.Router();
const {
  markAttendance,
  bulkMarkAttendance,
  getTodayAttendance,
  getStudentAttendance,
  getReport
} = require('../controllers/attendance.controller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/mark', markAttendance);
router.post('/bulk-mark', bulkMarkAttendance);
router.get('/today', getTodayAttendance);
router.get('/report', getReport);
router.get('/student/:studentId', getStudentAttendance);

module.exports = router;
// backend/routes/student.routes.js
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');

const {
  registerStudent,
  getAllStudents,
  getStudentsWithDescriptors,
  getStudent,
  updateStudent,
  updateFaceDescriptors,
  deleteStudent
} = require('../controllers/student.controller');

const { protect, authorize } = require('../middleware/auth');

// Multer config for face images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

// All routes require login
router.use(protect);

// GET all students / POST register new student
router.route('/')
  .get(getAllStudents)
  .post(upload.array('faceImages', 10), registerStudent);

// GET students with face descriptors (for face recognition)
router.get('/with-descriptors', getStudentsWithDescriptors);

// GET / PUT / DELETE single student
router.route('/:id')
  .get(getStudent)
  .put(updateStudent)
  .delete(deleteStudent);

// Update face descriptors
router.put('/:id/face-descriptors', updateFaceDescriptors);

module.exports = router;
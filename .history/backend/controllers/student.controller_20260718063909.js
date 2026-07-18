// backend/controllers/student.controller.js
const Student = require('../models/Student');

// @route  POST /api/students
exports.registerStudent = async (req, res) => {
  try {
    const { name, rollNumber, email, year, faceDescriptors } = req.body;

    if (!name || !rollNumber || !email || !year) {
      return res.status(400).json({
        success: false,
        message: 'Name, roll number, email and year are required'
      });
    }

    const existing = await Student.findOne({
      $or: [{ email: email.toLowerCase() }, { rollNumber: rollNumber.toUpperCase() }]
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Student with this email or roll number already exists'
      });
    }

    let parsedDescriptors = [];
    if (faceDescriptors) {
      parsedDescriptors = typeof faceDescriptors === 'string'
        ? JSON.parse(faceDescriptors)
        : faceDescriptors;
    }

    const faceImages = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        faceImages.push({
          filename: file.filename,
          path: `/uploads/${file.filename}`
        });
      });
    }

    const student = await Student.create({
      name,
      rollNumber:      rollNumber.toUpperCase(),
      email:           email.toLowerCase(),
      year:            parseInt(year),
      department:      '',
      section:         '',
      faceDescriptors: parsedDescriptors,
      faceImages,
      registeredBy:    req.user._id   // ✅ track who registered
    });

    console.log('✅ Student registered:', student.name, 'by', req.user.name);
    return res.status(201).json({ success: true, student });

  } catch (error) {
    console.error('❌ REGISTER STUDENT ERROR:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route  GET /api/students
// ✅ Only returns students registered by the logged-in teacher


// @route  GET /api/students/with-descriptors
// ✅ Only returns teacher's own students for face recognition
exports.getStudentsWithDescriptors = async (req, res) => {
  try {
    const students = await Student.find({
      isActive:                true,
      registeredBy:            req.user._id,
      'faceDescriptors.0':     { $exists: true }
    }).select('name rollNumber year faceDescriptors');

    return res.json({ success: true, students });
  } catch (error) {
    console.error('❌ GET DESCRIPTORS ERROR:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route  GET /api/students/:id
exports.getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('-faceDescriptors');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    return res.json({ success: true, student });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route  PUT /api/students/:id
exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    return res.json({ success: true, student });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route  PUT /api/students/:id/face-descriptors
exports.updateFaceDescriptors = async (req, res) => {
  try {
    const { faceDescriptors } = req.body;
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $push: { faceDescriptors: { $each: faceDescriptors } } },
      { new: true }
    );
    return res.json({ success: true, message: 'Face data updated', student });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route  DELETE /api/students/:id
exports.deleteStudent = async (req, res) => {
  try {
    await Student.findByIdAndUpdate(req.params.id, { isActive: false });
    return res.json({ success: true, message: 'Student deactivated' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
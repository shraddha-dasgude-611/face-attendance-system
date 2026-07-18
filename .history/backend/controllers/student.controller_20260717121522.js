const Student = require('../models/Student');

exports.registerStudent = async (req, res) => {
  try {
    const { name, rollNumber, email, department, year, section, faceDescriptors } = req.body;

    const existing = await Student.findOne({ $or: [{ email }, { rollNumber }] });
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
        faceImages.push({ filename: file.filename, path: `/uploads/${file.filename}` });
      });
    }

    const student = await Student.create({
      name,
      rollNumber: rollNumber.toUpperCase(),
      email: email.toLowerCase(),
      department: department || '',
      year: parseInt(year),
      section: section || '',
      faceDescriptors: parsedDescriptors,
      faceImages,
      registeredBy: req.user?._id
    });

    console.log('✅ Student registered:', student.name);
    return res.status(201).json({ success: true, student });

  } catch (error) {
    console.error('❌ REGISTER STUDENT ERROR:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = { isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await Student.find(filter)
      .select('-faceDescriptors')
      .sort({ rollNumber: 1 })
      .lean();

    const ids = students.map(s => s._id);
    const counts = await Student.aggregate([
      { $match: { _id: { $in: ids } } },
      {
        $project: {
          faceDescriptorCount: { $size: { $ifNull: ['$faceDescriptors', []] } }
        }
      }
    ]);

    const countMap = {};
    counts.forEach(c => { countMap[c._id.toString()] = c.faceDescriptorCount; });

    const studentsWithCount = students.map(s => ({
      ...s,
      faceDescriptorCount: countMap[s._id.toString()] || 0
    }));

    return res.json({ success: true, count: studentsWithCount.length, students: studentsWithCount });

  } catch (error) {
    console.error('❌ GET STUDENTS ERROR:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudentsWithDescriptors = async (req, res) => {
  try {
    const students = await Student.find({
      isActive: true,
      'faceDescriptors.0': { $exists: true }
    }).select('name rollNumber department faceDescriptors');

    return res.json({ success: true, students });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('-faceDescriptors');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    return res.json({ success: true, student });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    return res.json({ success: true, student });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

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

exports.deleteStudent = async (req, res) => {
  try {
    await Student.findByIdAndUpdate(req.params.id, { isActive: false });
    return res.json({ success: true, message: 'Student deactivated' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
// @route  GET /api/students
exports.getAllStudents = async (req, res) => {
  try {
    const { search } = req.query;

    // ✅ Teacher sees only students THEY registered
    const filter = {
      isActive: true,
      registeredBy: req.user._id
    };

    if (search) {
      filter.$or = [
        { name:       { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { email:      { $regex: search, $options: 'i' } }
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
          faceDescriptorCount: {
            $size: { $ifNull: ['$faceDescriptors', []] }
          }
        }
      }
    ]);

    const countMap = {};
    counts.forEach(c => { countMap[c._id.toString()] = c.faceDescriptorCount; });

    const studentsWithCount = students.map(s => ({
      ...s,
      faceDescriptorCount: countMap[s._id.toString()] || 0
    }));

    return res.json({
      success: true,
      count: studentsWithCount.length,
      students: studentsWithCount
    });

  } catch (error) {
    console.error('❌ GET STUDENTS ERROR:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
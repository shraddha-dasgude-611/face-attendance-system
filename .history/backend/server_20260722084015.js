// backend/server.js
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');
const fs      = require('fs');
require('dotenv').config();

const connectDB = require('./config/db');
connectDB();

const app = express();

app.use(cors({
  origin: function(origin, callback) {
    // Allow all vercel.app URLs + localhost
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
    ];
    
    // Allow any vercel.app subdomain
    if (!origin || 
        allowedOrigins.includes(origin) || 
        origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Serve uploaded face images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads folder if missing
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

// Routes
app.use('/api/auth',       require('./routes/auth.routes'));
app.use('/api/students',   require('./routes/student.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
});
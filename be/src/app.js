require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { calculatePayrollController } = require('./controllers/pit.controller');

// Routes
const authRoutes = require('./routes/auth.routes');
const periodRoutes = require('./routes/periods.routes');
const fileRoutes = require('./routes/files.routes');
const directFileRoutes = require('./routes/direct-files.routes');
const userManagementRoutes = require('./routes/userManagement.routes');

// Legacy multer setup for backward compatibility
const upload = multer().array('dataFiles', 20);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health
app.get('/', (req, res) => res.send('Payroll Pro API is running.'));

// New API routes (main application)
app.use('/api/auth', authRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/periods', fileRoutes); // Mount file routes under periods for upload/list
app.use('/api/files', directFileRoutes); // Direct file operations (delete)
app.use('/api/admin', userManagementRoutes);

// Legacy routes for backward compatibility
app.post('/api/calculate', upload, calculatePayrollController);
app.use('/api/import', require('./routes/import.routes'));

module.exports = app;

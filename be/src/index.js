// Filename: server/src/index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const {calculatePayrollController} = require('./controllers/pit.controller');
const databaseManager = require('./core/DatabaseManager');

// Import new routes
const authRoutes = require('./routes/auth.routes');
const periodRoutes = require('./routes/periods.routes');
const fileRoutes = require('./routes/files.routes');
const directFileRoutes = require('./routes/direct-files.routes');

// Legacy routes
const importRoutes = require('./routes/import.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Legacy multer setup for backward compatibility
const upload = multer().array('dataFiles', 20);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.get('/', (req, res) => res.send('Payroll Pro API is running.'));

// New API routes (main application)
app.use('/api/auth', authRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/periods', fileRoutes); // Mount file routes under periods for upload/list
app.use('/api/files', directFileRoutes); // Direct file operations (delete)
app.use('/api/admin', require('./routes/userManagement.routes'));

// Legacy routes for backward compatibility
app.post('/api/calculate', upload, calculatePayrollController);
app.use('/api/import', importRoutes);

// Initialize database using new DatabaseManager
databaseManager.initialize()
    .then(async () => {
        console.log('✅ Database initialized successfully with TypeORM!');

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running at http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.log('❌ Database initialization error: ', error);
        process.exit(1);
    });
# Payroll Pro - Bank Tax Management System

A comprehensive full-stack web application designed for banks to streamline monthly payroll tax calculation processes. The system allows authorized users to incrementally upload pay-related Excel files into specific Tax Periods, consolidate data, preview calculations, and export final reports.

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React.js with modern hooks and context API
- **Backend**: Node.js with Express.js
- **Database**: SQLite (easily switchable to PostgreSQL)
- **File Processing**: xlsx library for Excel file handling
- **Authentication**: JWT-based with role-based access control

### Key Features
- 🔐 **Secure Authentication** with role-based permissions
- 📊 **Tax Period Management** with status tracking
- 📁 **Drag & Drop File Upload** with validation
- 🧮 **Automated Tax Calculations** with preview functionality
- 📈 **Data Consolidation** across multiple Excel files
- 📋 **Export Reports** in Excel format
- 👥 **Multi-User Support** with UPLOADER and REVIEWER roles
- 💻 **Responsive Design** with professional banking UI
- 🌓 **Dark/Light Theme** support

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd THUE_TNCN
   ```

2. **Install Backend Dependencies**
   ```bash
   cd be
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../fe
   npm install
   ```

4. **Environment Setup**
   ```bash
   cd ../be
   cp .env.template .env
   ```
   Edit `.env` if needed (default values work for development).

5. **Start the Backend Server**
   ```bash
   cd be
   npm run dev
   ```
   The backend will start on `http://localhost:3001`

6. **Start the Frontend Development Server**
   ```bash
   cd fe
   npm run dev
   ```
   The frontend will start on `http://localhost:5173`

## 👥 User Accounts

The system comes with pre-configured demo accounts:

| Role | User ID | Password | Permissions |
|------|---------|----------|-------------|
| **Uploader** | `uploader1` | `password123` | Create periods, upload files, delete own files |
| **Reviewer** | `reviewer1` | `password123` | All uploader permissions + status management, consolidation, export |
| **Admin** | `admin1` | `admin123` | Full reviewer permissions |

## 📋 User Guide

### 1. Login
- Navigate to the application
- Use one of the demo accounts above
- Click on a demo account button for quick login

### 2. Dashboard
- View all tax periods in a grid layout
- See period status, file count, and creation info
- Create new tax periods with descriptive names

### 3. Tax Period Management

#### Creating a Tax Period
1. Click "Create New Tax Period" on the dashboard
2. Enter a descriptive name (e.g., "September 2025")
3. The period will be created with "IN_PROGRESS" status

#### Uploading Files
1. Click on a tax period to view details
2. Drag and drop Excel files or click to browse
3. Only `.xlsx` and `.xls` files are accepted
4. Files are validated and stored securely

#### Consolidation & Preview (Reviewers Only)
1. Navigate to a period with uploaded files
2. Click "Consolidate & Preview Results" in the Actions panel
3. The system will:
   - Process all Excel files
   - Consolidate employee data by Employee ID
   - Apply tax calculation (10% of total income)
   - Show preview with summary statistics

#### Exporting Reports (Reviewers Only)
1. After successful consolidation
2. Click "Export Excel Report"
3. Download the comprehensive tax calculation report

### 4. File Management
- View all uploaded files with metadata
- Delete files you uploaded (or any file as Reviewer)
- Track upload history and file sizes

## 🗂️ Data Models

### User
- `userId`: Unique identifier
- `name`: Full name
- `role`: UPLOADER or REVIEWER
- `email`: Contact email

### TaxPeriod
- `periodId`: UUID identifier
- `name`: Descriptive name (e.g., "August 2025")
- `status`: IN_PROGRESS, COMPLETED
- `createdBy`: User who created the period
- `fileCount`: Number of uploaded files

### UploadedFile
- `fileId`: UUID identifier
- `periodId`: Associated tax period
- `fileName`: Original filename
- `filePath`: Secure storage path
- `uploadedBy`: User who uploaded the file
- `fileSize`: File size in bytes

## 📊 Tax Calculation Logic

The system processes Excel files with the following expected columns:
- `EmployeeID` or `ID` or `MÃ NV` or `STT`
- `FullName` or `Name` or `HỌ VÀ TÊN`
- `IncomeAmount` or `Income` or `LƯƠNG V1`

**Calculation Process:**
1. **Data Consolidation**: Sum income amounts for each unique Employee ID across all files
2. **Tax Calculation**: Apply 10% tax rate to total income
3. **Report Generation**: Create comprehensive Excel report with:
   - Employee details
   - Total income per employee
   - Calculated tax amounts
   - Summary statistics

## 🔒 Security Features

- **Role-Based Access Control (RBAC)**
- **Secure File Upload** with type validation
- **Protected API Endpoints** requiring authentication
- **File Storage Security** - uploaded files not publicly accessible
- **Session Management** with JWT tokens
- **Input Validation** and sanitization

## 🎨 UI/UX Design

### Color Palette
- **Primary**: #005A9C (Corporate Blue)
- **Success**: #1E8449 (Green)
- **Error**: #C0392B (Red)
- **Warning**: #F39C12 (Orange)
- **Background**: #F2F2F2 (Light Gray)

### Typography
- **Font**: Inter, Roboto, System fonts
- **Headers**: 28px, bold
- **Body**: 14px, regular
- **Captions**: 12px, medium

### Components
- Professional banking-style interface
- Clean, intuitive navigation
- Loading indicators for all async operations
- Toast notifications for user feedback
- Responsive design for all screen sizes

## 📁 Project Structure

```
THUE_TNCN/
├── be/                          # Backend application
│   ├── src/
│   │   ├── controllers/         # Request handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── taxPeriod.controller.js
│   │   │   ├── file.controller.js
│   │   │   └── pit.controller.js (legacy)
│   │   ├── models/              # Database models
│   │   │   └── index.js
│   │   ├── routes/              # API routes
│   │   │   ├── auth.routes.js
│   │   │   ├── periods.routes.js
│   │   │   ├── files.routes.js
│   │   │   └── import.routes.js (legacy)
│   │   └── index.js             # Main server file
│   ├── uploads/                 # File storage
│   ├── results/                 # Generated reports
│   ├── .env                     # Environment variables
│   └── package.json
├── fe/                          # Frontend application
│   ├── src/
│   │   ├── components/          # Reusable components
│   │   ├── contexts/            # React contexts
│   │   │   └── AuthContext.jsx
│   │   ├── pages/               # Page components
│   │   │   ├── Login/
│   │   │   ├── Dashboard/
│   │   │   ├── PeriodDetail/
│   │   │   └── Import/ (legacy)
│   │   ├── lib/                 # Utilities
│   │   │   └── api.js
│   │   ├── App.jsx              # Main app component
│   │   └── main.jsx             # App entry point
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Tax Periods
- `GET /api/periods` - List all periods
- `POST /api/periods` - Create new period
- `GET /api/periods/:id` - Get period details
- `PUT /api/periods/:id/status` - Update period status
- `POST /api/periods/:id/preview` - Consolidate and preview
- `GET /api/periods/:id/export` - Export report

### File Management
- `POST /api/periods/:id/files` - Upload file
- `DELETE /api/files/:id` - Delete file

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   # Backend .env
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=postgresql://...  # For PostgreSQL
   JWT_SECRET=your-secret-key
   ```

2. **Database Migration**
   - For PostgreSQL: Update database configuration in `models/index.js`
   - Run database migrations

3. **Build Frontend**
   ```bash
   cd fe
   npm run build
   ```

4. **Start Production Server**
   ```bash
   cd be
   npm start
   ```

### Docker Deployment (Optional)

Create `Dockerfile` for containerized deployment:

```dockerfile
# Backend Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🧪 Testing

### Manual Testing Workflow

1. **Authentication Testing**
   - Test login with all user roles
   - Verify role-based access restrictions

2. **File Upload Testing**
   - Test various Excel file formats
   - Verify file validation and error handling

3. **Calculation Testing**
   - Upload sample data files
   - Verify consolidation accuracy
   - Check tax calculation logic

4. **Report Generation Testing**
   - Test Excel export functionality
   - Verify report completeness and formatting

## 🔄 Legacy Support

The application maintains backward compatibility with the original import system:
- Legacy routes have been removed in the latest version
- Original import functionality preserved
- Existing data migration supported

## 📈 Future Enhancements

- **Advanced Tax Rules**: Configurable tax brackets and deductions
- **Audit Trail**: Complete activity logging
- **Data Validation**: Advanced Excel format validation
- **Notifications**: Email alerts for period status changes
- **Reports**: Additional report formats (PDF, CSV)
- **API Documentation**: Swagger/OpenAPI integration
- **Unit Tests**: Comprehensive test coverage
- **Performance**: Caching and optimization for large files

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure `.env` file exists with correct settings
   - Check database file permissions

2. **File Upload Issues**
   - Verify upload directory permissions
   - Check file size limits (10MB default)

3. **Authentication Problems**
   - Clear browser localStorage
   - Verify JWT token format

4. **Excel Processing Errors**
   - Ensure files have expected column headers
   - Check for data format consistency

### Development Commands

```bash
# Backend
npm run dev          # Start development server
npm start           # Start production server

# Frontend  
npm run dev         # Start development server
npm run build       # Build for production
npm run preview     # Preview production build
```

## 📞 Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.

---

**Payroll Pro** - Streamlining bank tax management with enterprise-grade security and efficiency.

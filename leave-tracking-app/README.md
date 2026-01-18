# Kandy Hospital - Leave Tracking System

A comprehensive leave management system for the Physiotherapy Department at Kandy Hospital.

## Features

### Admin Features
- 📊 Dashboard with leave statistics overview
- 👥 View all employees and their leave counts
- 📋 Expandable employee cards showing detailed leave history
- ⚡ Quick view of recently updated leaves
- ✅ Approve/Reject leave applications
- 📈 Leave type breakdown (Casual, Annual, Short)

### Employee Features
- 📝 Apply for leave with a simple form
- 👤 Select employee name from dropdown
- 📅 Choose leave type and dates
- 📊 View remaining leave balance
- 📜 View personal leave history and status

## Leave Policy
- **Casual Leaves**: 20 per year
- **Annual Leaves**: 15 per year
- **Short Leaves**: 2 per month

## Tech Stack
- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Authentication**: JWT
- **UI**: Custom CSS with modern design

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Installation

1. **Install Backend Dependencies**
```bash
cd backend
npm install
```

2. **Initialize Database**
```bash
npm run init-db
```

3. **Start Backend Server**
```bash
npm run dev
```
Backend runs on http://localhost:5000

4. **Install Frontend Dependencies** (new terminal)
```bash
cd frontend
npm install
```

5. **Start Frontend**
```bash
npm run dev
```
Frontend runs on http://localhost:3000

## Default Credentials

### Admin Account
- Email: `admin@kandyhospital.lk`
- Password: `admin123`

### Employee Accounts
- Email: `anudi@kandyhospital.lk` | Password: `password123`
- Email: `savindi@kandyhospital.lk` | Password: `password123`
- Email: `senaka@kandyhospital.lk` | Password: `password123`
- Email: `apsara@kandyhospital.lk` | Password: `password123`

## Project Structure

```
Leave Tracking App/
├── backend/
│   ├── package.json
│   ├── server.js          # Express API server
│   ├── initDb.js          # Database initialization
│   └── leave_tracker.db   # SQLite database (created after init)
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── components/
│       │   └── Layout.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── AdminDashboard.jsx
│           └── EmployeeDashboard.jsx
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Employees
- `GET /api/employees` - List all employees
- `GET /api/employees/:id/balance` - Get employee leave balance

### Leaves
- `POST /api/leaves` - Apply for leave
- `GET /api/leaves` - Get all leaves (admin)
- `GET /api/leaves/user/:userId` - Get user's leaves
- `GET /api/leaves/recent` - Get recent leaves
- `PATCH /api/leaves/:id/status` - Approve/reject leave (admin)

### Statistics (Admin)
- `GET /api/stats/overview` - Get overview statistics
- `GET /api/stats/employees` - Get employee-wise summary

## Screenshots

### Login Page
Beautiful login interface with hospital branding

### Admin Dashboard
- Statistics cards showing total employees, pending/approved/rejected leaves
- Employee list with expandable details
- Quick view of recent updates
- Pending approvals table with approve/reject actions

### Employee Dashboard
- Leave balance cards (Casual, Annual, Short)
- Leave application form with employee picker
- Personal leave history table

---

Built with ❤️ for Kandy Hospital Physiotherapy Department

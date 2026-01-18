# Quick Start - Run Locally

## Option 1: Use the Script (Easiest)

Double-click `start-local.ps1` or run:
```powershell
.\start-local.ps1
```

This will open two terminal windows:
- Backend on port 5000
- Frontend on port 3000

---

## Option 2: Manual Start (Step by Step)

### Step 1: Start Backend

Open **Terminal 1** and run:
```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 5000
```

### Step 2: Start Frontend

Open **Terminal 2** (new terminal) and run:
```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.0.10  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

### Step 3: Open Browser

Go to: **http://localhost:3000**

---

## Troubleshooting

### Backend won't start?
- Make sure port 5000 is free
- Run `npm install` in backend folder
- Run `npm run init-db` to initialize database

### Frontend won't start?
- Make sure port 3000 is free
- Run `npm install` in frontend folder

### Can't connect to API?
- Make sure backend is running on port 5000
- Check browser console for errors

---

## What You'll See

- **Frontend**: http://localhost:3000
  - Public Dashboard (leave application form)
  - Admin Dashboard (at /admin)

- **Backend API**: http://localhost:5000
  - API endpoints available at /api/*

---

**That's it!** Your app is now running locally! 🚀

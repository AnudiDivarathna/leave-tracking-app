// Load environment variables from .env file if available
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed, that's okay
}

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'leave-tracker-secret-key-2024';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set!');
  console.error('Please create a .env file with: MONGODB_URI=your_connection_string');
  process.exit(1);
}

let client = null;
let db = null;

// Initialize MongoDB connection
async function initDB() {
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db('leave_tracker');
    console.log('✅ Connected to MongoDB');
    
    // Initialize default employees if they don't exist
    await initializeDefaultEmployees();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
}

// Initialize default employees
// Note: Use initMongoEmployees.js script to add production employees
// This function is kept for backward compatibility but won't auto-add test employees
async function initializeDefaultEmployees() {
  const usersCollection = db.collection('users');
  
  // Don't auto-initialize employees - use initMongoEmployees.js script instead
  // This prevents adding test employees automatically
  
  // Show all employees
  const allEmployees = await usersCollection.find({ role: 'employee' }).toArray();
  console.log(`📋 Total employees: ${allEmployees.length}`);
  if (allEmployees.length > 0) {
    console.log(`Employees: ${allEmployees.map(e => e.name).join(', ')}`);
  }
}

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// ============== EMPLOYEE ROUTES ==============

// Get all employees (for dropdown/autocomplete)
app.get('/api/employees', async (req, res) => {
  try {
    const users = await db.collection('users').find({ role: 'employee' }).toArray();
    const employees = users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      paysheet_number: u.paysheet_number || null
    }));
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============== AUTHENTICATION ROUTES ==============

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Check email + paysheet number match (for first login verification)
app.post('/api/auth/verify', async (req, res) => {
  const { paysheet_number, email } = req.body;

  if (!paysheet_number || !email) {
    return res.status(400).json({ error: 'Paysheet number and email are required' });
  }

  try {
    const user = await db.collection('users').findOne({ 
      paysheet_number: paysheet_number,
      email: email.toLowerCase(),
      role: 'employee'
    });

    if (!user) {
      return res.status(404).json({ error: 'Email and paysheet number do not match. Please check your details.' });
    }

    // Check if first login is required
    if (user.first_login === false) {
      return res.status(400).json({ error: 'Account already set up. Please use regular login.', already_setup: true });
    }

    res.json({
      verified: true,
      name: user.name,
      paysheet_number: user.paysheet_number
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// First login - set password (after email+paysheet verified)
app.post('/api/auth/first-login', async (req, res) => {
  const { paysheet_number, email, password } = req.body;

  if (!paysheet_number || !email || !password) {
    return res.status(400).json({ error: 'Paysheet number, email, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Verify email and paysheet match
    const user = await db.collection('users').findOne({ 
      paysheet_number: paysheet_number,
      email: email.toLowerCase(),
      role: 'employee'
    });

    if (!user) {
      return res.status(404).json({ error: 'Email and paysheet number do not match' });
    }

    // If first_login is explicitly false, account is already set up
    if (user.first_login === false) {
      return res.status(400).json({ error: 'Account already set up. Please use regular login.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user with password and set first_login to false
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          first_login: false,
          updated_at: new Date()
        }
      }
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id.toString(), 
        name: user.name, 
        paysheet_number: user.paysheet_number,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Account setup successful',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        paysheet_number: user.paysheet_number,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Regular login (email + password)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await db.collection('users').findOne({ 
      email: email.toLowerCase(),
      role: 'employee'
    });

    if (!user) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Check if first login is required (first_login is true or undefined, or password not set)
    if (user.first_login !== false || !user.password) {
      return res.status(400).json({ 
        error: 'First login required. Please set up your account with email and paysheet number.',
        first_login: true 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id.toString(), 
        name: user.name, 
        paysheet_number: user.paysheet_number,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        paysheet_number: user.paysheet_number,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if paysheet number needs first login
app.post('/api/auth/check', async (req, res) => {
  const { paysheet_number } = req.body;

  if (!paysheet_number) {
    return res.status(400).json({ error: 'Paysheet number is required' });
  }

  try {
    const user = await db.collection('users').findOne({ 
      paysheet_number: paysheet_number,
      role: 'employee'
    });

    if (!user) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // first_login is true if: first_login field is not false OR password is not set
    const needsFirstLogin = user.first_login !== false || !user.password;
    
    res.json({
      exists: true,
      first_login: needsFirstLogin,
      name: user.name
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user info (protected route)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(req.user.id)
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      name: user.name,
      paysheet_number: user.paysheet_number,
      email: user.email
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's own leaves (protected route)
app.get('/api/auth/my-leaves', authenticateToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.id);
    
    const leaves = await db.collection('leaves')
      .find({ user_id: userId })
      .sort({ applied_at: -1 })
      .toArray();

    const formattedLeaves = leaves.map(leave => ({
      id: leave._id.toString(),
      leave_type: leave.leave_type,
      leave_duration: leave.leave_duration,
      half_day_period: leave.half_day_period,
      dates: Array.isArray(leave.dates) ? leave.dates : [],
      reason: leave.reason,
      covering_officer: leave.covering_officer,
      status: leave.status,
      applied_at: leave.applied_at,
      updated_at: leave.updated_at
    }));

    res.json(formattedLeaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============== LEAVE ROUTES ==============

// Apply for leave (public)
app.post('/api/leaves', async (req, res) => {
  const { user_id, leave_type, dates, reason, covering_officer, leave_duration, half_day_period } = req.body;

  try {
    // Convert user_id to ObjectId if it's a valid MongoDB ObjectId string
    let userId = user_id;
    if (ObjectId.isValid(user_id)) {
      userId = new ObjectId(user_id);
    }

    const leave = {
      user_id: userId,
      leave_type: leave_type || 'casual', // Default to casual (Annual Leave)
      leave_duration: leave_duration || 'full_day', // 'full_day' or 'half_day'
      half_day_period: half_day_period || null, // 'morning' or 'evening' - only for half_day
      dates: Array.isArray(dates) ? dates : [],
      reason: reason || '',
      covering_officer: covering_officer || null,
      status: 'pending',
      applied_at: new Date(),
      updated_at: new Date()
    };

    const result = await db.collection('leaves').insertOne(leave);
    
    res.status(201).json({
      id: result.insertedId.toString(),
      message: 'Leave application submitted successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all leaves
app.get('/api/leaves', async (req, res) => {
  try {
    const leaves = await db.collection('leaves')
      .aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            id: { $toString: '$_id' },
            user_id: { $toString: '$user_id' },
            leave_type: 1,
            leave_duration: 1,
            half_day_period: 1,
            dates: 1,
            reason: 1,
            covering_officer: 1,
            status: 1,
            applied_at: 1,
            updated_at: 1,
            employee_name: '$user.name'
          }
        },
        {
          $sort: { applied_at: -1 }
        }
      ])
      .toArray();

    // Parse dates if they're stored as strings
    const parsedLeaves = leaves.map(leave => ({
      ...leave,
      dates: Array.isArray(leave.dates) ? leave.dates : (leave.dates ? JSON.parse(leave.dates) : [])
    }));

    res.json(parsedLeaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve/Reject leave (admin) - alternative route with ID in body
app.patch('/api/leaves-status', async (req, res) => {
  const { id, status } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Leave ID is required' });
  }

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
  }

  try {
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid leave ID' });
    }

    const result = await db.collection('leaves').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: status,
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Leave not found' });
    }

    res.json({ message: `Leave ${status} successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve/Reject leave (admin) - original route with ID in URL
app.patch('/api/leaves/:id/status', async (req, res) => {
  const { status } = req.body;
  const leaveId = req.params.id;

  try {
    if (!ObjectId.isValid(leaveId)) {
      return res.status(400).json({ error: 'Invalid leave ID' });
    }

    const result = await db.collection('leaves').updateOne(
      { _id: new ObjectId(leaveId) },
      {
        $set: {
          status: status,
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Leave not found' });
    }

    res.json({ message: `Leave ${status} successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============== CLEAR LEAVES ROUTE ==============

// Clear all leaves data (keeps employees)
app.delete('/api/clear-leaves', async (req, res) => {
  try {
    const result = await db.collection('leaves').deleteMany({});
    console.log(`Cleared ${result.deletedCount} leaves from database`);
    res.json({ 
      message: 'All leaves data cleared successfully',
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('Error clearing leaves:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Also accept POST for flexibility
app.post('/api/clear-leaves', async (req, res) => {
  try {
    const result = await db.collection('leaves').deleteMany({});
    console.log(`Cleared ${result.deletedCount} leaves from database`);
    res.json({ 
      message: 'All leaves data cleared successfully',
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('Error clearing leaves:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ============== STATISTICS ROUTES (Admin) ==============

// Get leave statistics
app.get('/api/stats/overview', async (req, res) => {
  try {
    const totalEmployees = await db.collection('users').countDocuments({ role: 'employee' });
    const totalLeaves = await db.collection('leaves').countDocuments();
    const pendingLeaves = await db.collection('leaves').countDocuments({ status: 'pending' });
    const approvedLeaves = await db.collection('leaves').countDocuments({ status: 'approved' });
    const rejectedLeaves = await db.collection('leaves').countDocuments({ status: 'rejected' });

    // Leave type breakdown
    const casualLeaves = await db.collection('leaves').countDocuments({ leave_type: 'casual' });
    const medicalLeaves = await db.collection('leaves').countDocuments({ leave_type: 'medical' });
    const halfdayLeaves = await db.collection('leaves').countDocuments({ leave_type: 'halfday' });
    const shortLeaves = await db.collection('leaves').countDocuments({ leave_type: 'short' });

    res.json({
      totalEmployees,
      totalLeaves,
      pendingLeaves,
      approvedLeaves,
      rejectedLeaves,
      leaveTypeBreakdown: {
        casual: casualLeaves,
        medical: medicalLeaves,
        halfday: halfdayLeaves,
        short: shortLeaves
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get employee-wise leave summary
app.get('/api/stats/employees', async (req, res) => {
  try {
    const employees = await db.collection('users')
      .aggregate([
        {
          $match: { role: 'employee' }
        },
        {
          $lookup: {
            from: 'leaves',
            localField: '_id',
            foreignField: 'user_id',
            as: 'leaves'
          }
        },
        {
          $project: {
            id: { $toString: '$_id' },
            name: 1,
            total_leaves: {
              $size: {
                $filter: {
                  input: '$leaves',
                  as: 'leave',
                  cond: { $ne: ['$$leave.status', 'rejected'] }
                }
              }
            },
            approved_leaves: {
              $size: {
                $filter: {
                  input: '$leaves',
                  as: 'leave',
                  cond: { $eq: ['$$leave.status', 'approved'] }
                }
              }
            },
            pending_leaves: {
              $size: {
                $filter: {
                  input: '$leaves',
                  as: 'leave',
                  cond: { $eq: ['$$leave.status', 'pending'] }
                }
              }
            },
            casual_leaves: {
              $size: {
                $filter: {
                  input: '$leaves',
                  as: 'leave',
                  cond: { $eq: ['$$leave.leave_type', 'casual'] }
                }
              }
            },
            medical_leaves: {
              $size: {
                $filter: {
                  input: '$leaves',
                  as: 'leave',
                  cond: { $eq: ['$$leave.leave_type', 'medical'] }
                }
              }
            },
            halfday_leaves: {
              $size: {
                $filter: {
                  input: '$leaves',
                  as: 'leave',
                  cond: { $eq: ['$$leave.leave_type', 'halfday'] }
                }
              }
            },
            short_leaves: {
              $size: {
                $filter: {
                  input: '$leaves',
                  as: 'leave',
                  cond: { $eq: ['$$leave.leave_type', 'short'] }
                }
              }
            }
          }
        },
        {
          $match: { total_leaves: { $gt: 0 } } // Only include employees who have taken leaves
        },
        {
          $sort: { name: 1 }
        }
      ])
      .toArray();

    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize and start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Connected to MongoDB`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
  process.exit(0);
});

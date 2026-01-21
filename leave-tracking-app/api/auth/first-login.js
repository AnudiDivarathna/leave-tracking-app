// POST /api/auth/first-login - First login (set password)
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'leave-tracker-secret-key-2024';

let client = null;

async function getDatabase() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
  }
  return client.db('leave_tracker');
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { paysheet_number, email, password } = req.body;

  if (!paysheet_number || !email || !password) {
    return res.status(400).json({ error: 'Paysheet number, email, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const db = await getDatabase();
    
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
    console.error('First login error:', err);
    res.status(500).json({ error: err.message });
  }
};

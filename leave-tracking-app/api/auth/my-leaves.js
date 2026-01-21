// GET /api/auth/my-leaves - Get user's own leaves (protected)
const { MongoClient, ObjectId } = require('mongodb');
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify token
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = await getDatabase();
    const userId = new ObjectId(decoded.id);
    
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
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    console.error('My leaves error:', err);
    res.status(500).json({ error: err.message });
  }
};

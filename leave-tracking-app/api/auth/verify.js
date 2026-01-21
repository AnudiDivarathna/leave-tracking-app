// POST /api/auth/verify - Verify email + paysheet number match
const { MongoClient } = require('mongodb');

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

  const { paysheet_number, email } = req.body;

  if (!paysheet_number || !email) {
    return res.status(400).json({ error: 'Paysheet number and email are required' });
  }

  try {
    const db = await getDatabase();
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
    console.error('Verify error:', err);
    res.status(500).json({ error: err.message });
  }
};

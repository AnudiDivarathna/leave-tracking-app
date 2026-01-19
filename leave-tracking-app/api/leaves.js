// GET /api/leaves and POST /api/leaves
const { getAllLeaves, createLeave } = require('./db');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET /api/leaves
  if (req.method === 'GET') {
    try {
      const leaves = await getAllLeaves();
      // Parse dates if they're stored as strings
      const parsedLeaves = leaves.map(leave => ({
        ...leave,
        dates: Array.isArray(leave.dates) ? leave.dates : (leave.dates ? JSON.parse(leave.dates) : [])
      }));
      res.json(parsedLeaves);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // POST /api/leaves
  if (req.method === 'POST') {
    const { user_id, leave_type, dates, reason, covering_officer } = req.body;

    if (!user_id || !dates || !Array.isArray(dates)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const leave = await createLeave({ 
        user_id, 
        leave_type: leave_type || 'casual', // Default to casual (Annual Leave)
        dates, 
        reason,
        covering_officer
      });
      res.status(201).json({
        id: leave.id,
        message: 'Leave application submitted successfully'
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};

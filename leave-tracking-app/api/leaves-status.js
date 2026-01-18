// PATCH /api/leaves-status
// Alternative route structure for Vercel compatibility
const { getLeaveById, updateLeaveStatus } = require('./db');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Accept both PATCH and POST
  if (req.method !== 'PATCH' && req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      received: req.method,
      expected: 'PATCH or POST'
    });
  }

  // Get ID and status from request body
  const { id, status } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Leave ID is required' });
  }

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
  }

  try {
    console.log('Status update request:', { id, status, method: req.method });
    
    // For MongoDB, we need to convert string ID to ObjectId if needed
    const { ObjectId } = require('mongodb');
    let leaveId = id;
    
    // Try to convert to ObjectId if it's a valid MongoDB ObjectId format
    try {
      if (ObjectId.isValid(id)) {
        leaveId = new ObjectId(id);
      }
    } catch (e) {
      // If not valid ObjectId, use as string (for memory fallback)
      leaveId = id;
    }

    const leave = await getLeaveById(leaveId);
    
    if (!leave) {
      console.error('Leave not found:', id);
      return res.status(404).json({ error: 'Leave not found' });
    }

    await updateLeaveStatus(leaveId, status);
    console.log('Status updated successfully:', { id, status });
    res.json({ message: `Leave ${status} successfully` });
  } catch (err) {
    console.error('Error updating leave status:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

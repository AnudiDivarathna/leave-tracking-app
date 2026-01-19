// PATCH /api/leaves-status
// Alternative route structure for Vercel compatibility
const { updateLeaveStatus } = require('./db');

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
    console.log('Status update request:', { id, status });
    
    // Pass string ID directly - let updateLeaveStatus handle conversion
    const result = await updateLeaveStatus(id, status);
    
    if (!result) {
      console.error('Leave not found or update failed:', id);
      return res.status(404).json({ error: 'Leave not found' });
    }

    console.log('Status updated successfully:', { id, status });
    res.json({ message: `Leave ${status} successfully`, leave: result });
  } catch (err) {
    console.error('Error updating leave status:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

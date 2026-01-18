// PATCH /api/leaves/:id/status
// Vercel dynamic route: [id] can be in req.query.id or parsed from URL
const { getLeaveById, updateLeaveStatus } = require('../../db');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Log the incoming request for debugging
  console.log('Status endpoint called:', {
    method: req.method,
    url: req.url,
    query: req.query,
    body: req.body
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Accept both PATCH and POST (some proxies convert PATCH to POST)
  if (req.method !== 'PATCH' && req.method !== 'POST') {
    console.error('Method not allowed:', req.method);
    return res.status(405).json({ 
      error: 'Method not allowed',
      received: req.method,
      expected: 'PATCH or POST'
    });
  }

  // Get ID from query parameter or URL path
  // Vercel dynamic routes: [id] is available in req.query.id
  // But we should also check the URL path as fallback
  let id = req.query.id;
  
  // If not in query, try to extract from URL path
  if (!id && req.url) {
    const match = req.url.match(/\/api\/leaves\/([^\/]+)\/status/);
    if (match) {
      id = match[1];
    }
  }
  const { status } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Leave ID is required' });
  }

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
  }

  try {
    console.log('Status update request:', { id, status, method: req.method, url: req.url, query: req.query });
    
    // For MongoDB, we need to convert string ID to ObjectId if needed
    // But first try as string, MongoDB driver handles conversion
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

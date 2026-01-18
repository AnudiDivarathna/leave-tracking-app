// PATCH /api/leaves/:id/status
// Vercel dynamic route: [id] becomes req.query.id
const { getLeaveById, updateLeaveStatus } = require('../../db');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get ID from query parameter (Vercel converts [id] to query param)
  const id = req.query.id;
  const { status } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Leave ID is required' });
  }

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
  }

  try {
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
      return res.status(404).json({ error: 'Leave not found' });
    }

    await updateLeaveStatus(leaveId, status);
    res.json({ message: `Leave ${status} successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

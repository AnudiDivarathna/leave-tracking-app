// DELETE /api/leaves/:id
// Delete a specific leave by ID
const { deleteLeave } = require('../../db');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow DELETE method
  if (req.method !== 'DELETE') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      received: req.method,
      expected: 'DELETE'
    });
  }

  // Get ID from query parameter (Vercel dynamic routes)
  let id = req.query.id;
  
  // If not in query, try to extract from URL path
  if (!id && req.url) {
    const match = req.url.match(/\/api\/leaves\/([^\/]+)/);
    if (match) {
      id = match[1];
    }
  }

  if (!id) {
    return res.status(400).json({ error: 'Leave ID is required' });
  }

  try {
    console.log('Delete leave request:', { id, url: req.url, query: req.query });

    const result = await deleteLeave(id);

    if (!result) {
      return res.status(404).json({ error: 'Leave not found' });
    }

    res.json({ 
      message: 'Leave deleted successfully',
      id: result.id
    });
  } catch (err) {
    console.error('Error deleting leave:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

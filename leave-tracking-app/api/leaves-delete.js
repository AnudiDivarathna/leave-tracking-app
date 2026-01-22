// DELETE /api/leaves-delete
// Alternative route structure for Vercel compatibility
// Takes ID from request body
const { deleteLeave } = require('./db');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Accept both DELETE and POST (some proxies convert DELETE to POST)
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      received: req.method,
      expected: 'DELETE or POST'
    });
  }

  // Get ID from request body
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Leave ID is required' });
  }

  try {
    console.log('Delete leave request:', { id, method: req.method, url: req.url });

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

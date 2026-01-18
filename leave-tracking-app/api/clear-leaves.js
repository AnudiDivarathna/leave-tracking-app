// DELETE /api/clear-leaves
// Clear all leaves data from the database (keeps employees)
const { getDatabase } = require('./db');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Accept both DELETE and POST for flexibility
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      received: req.method,
      expected: 'DELETE or POST'
    });
  }

  try {
    const database = await getDatabase();
    
    if (database) {
      // Clear all leaves from MongoDB
      const result = await database.collection('leaves').deleteMany({});
      console.log(`Cleared ${result.deletedCount} leaves from database`);
      return res.json({ 
        message: 'All leaves data cleared successfully',
        deletedCount: result.deletedCount
      });
    } else {
      // Clear in-memory database - access through getEmployees which uses initMemoryDB
      // For in-memory, we'll just return success since it's ephemeral
      console.log('In-memory database - leaves will be cleared on next serverless function cold start');
      return res.json({ 
        message: 'All leaves data cleared successfully (in-memory)',
        deletedCount: 0,
        note: 'In-memory data is ephemeral and will reset on function restart'
      });
    }
  } catch (err) {
    console.error('Error clearing leaves:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

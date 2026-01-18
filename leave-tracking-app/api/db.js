// Database utility for Vercel serverless functions
// Using MongoDB Atlas for persistent storage
const { MongoClient } = require('mongodb');

let client = null;
let db = null;

// MongoDB connection
async function getMongoClient() {
  if (client) return client;

  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.warn('MONGODB_URI not set, using in-memory fallback');
    return null;
  }

  try {
    client = new MongoClient(uri);
    await client.connect();
    return client;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    return null;
  }
}

async function getDatabase() {
  if (db) return db;

  const mongoClient = await getMongoClient();
  if (!mongoClient) return null;

  db = mongoClient.db('leave_tracker');
  return db;
}

// Initialize default employees if they don't exist
async function initializeDefaultEmployees() {
  const database = await getDatabase();
  if (!database) return;

  const usersCollection = database.collection('users');
  const count = await usersCollection.countDocuments();

  if (count === 0) {
    const defaultEmployees = [
      { name: 'Anudi', role: 'employee', created_at: new Date() },
      { name: 'Savindi', role: 'employee', created_at: new Date() },
      { name: 'Senaka', role: 'employee', created_at: new Date() },
      { name: 'Apsara', role: 'employee', created_at: new Date() }
    ];
    await usersCollection.insertMany(defaultEmployees);
  }
}

// In-memory fallback
let memoryDb = null;

function initMemoryDB() {
  if (memoryDb) return memoryDb;

  memoryDb = {
    users: [
      { id: 1, name: 'Anudi', role: 'employee', created_at: new Date().toISOString() },
      { id: 2, name: 'Savindi', role: 'employee', created_at: new Date().toISOString() },
      { id: 3, name: 'Senaka', role: 'employee', created_at: new Date().toISOString() },
      { id: 4, name: 'Apsara', role: 'employee', created_at: new Date().toISOString() }
    ],
    leaves: [],
    nextUserId: 5,
    nextLeaveId: 1
  };

  return memoryDb;
}

// Helper functions
async function getEmployees() {
  const database = await getDatabase();
  
  if (database) {
    await initializeDefaultEmployees();
    const users = await database.collection('users').find({ role: 'employee' }).toArray();
    return users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      role: u.role,
      created_at: u.created_at
    }));
  }

  // Fallback to memory
  const memDb = initMemoryDB();
  return memDb.users.filter(u => u.role === 'employee').map(u => ({
    id: u.id.toString(),
    name: u.name,
    role: u.role,
    created_at: u.created_at
  }));
}

async function getUserById(id) {
  const database = await getDatabase();
  const { ObjectId } = require('mongodb');
  
  // Convert to ObjectId if it's a valid MongoDB ObjectId, otherwise use as string
  let queryId = id;
  if (database && ObjectId.isValid(id)) {
    try {
      queryId = new ObjectId(id);
    } catch (e) {
      queryId = id;
    }
  }
  
  if (database) {
    const user = await database.collection('users').findOne({ _id: queryId });
    if (user) {
      return {
        id: user._id.toString(),
        name: user.name,
        role: user.role,
        created_at: user.created_at
      };
    }
    return null;
  }

  // Fallback to memory
  const memDb = initMemoryDB();
  const user = memDb.users.find(u => u.id.toString() === id.toString());
  return user ? { ...user, id: user.id.toString() } : null;
}

async function getAllLeaves() {
  const database = await getDatabase();
  let leaves = [];
  let users = [];

  if (database) {
    leaves = await database.collection('leaves').find({}).sort({ applied_at: -1 }).toArray();
    users = await getEmployees();
    
    return leaves.map(leave => {
      const leaveUserId = leave.user_id?.toString() || leave.user_id;
      const user = users.find(u => u.id === leaveUserId);
      return {
        id: leave._id.toString(),
        user_id: leaveUserId,
        leave_type: leave.leave_type,
        dates: Array.isArray(leave.dates) ? leave.dates : (leave.dates ? JSON.parse(leave.dates) : []),
        reason: leave.reason || '',
        status: leave.status,
        applied_at: leave.applied_at,
        updated_at: leave.updated_at,
        employee_name: user ? user.name : 'Unknown'
      };
    });
  }

  // Fallback to memory
  const memDb = initMemoryDB();
  users = await getEmployees();
  return memDb.leaves.map(leave => {
    const user = users.find(u => u.id.toString() === leave.user_id?.toString());
    return {
      ...leave,
      id: leave.id.toString(),
      user_id: leave.user_id.toString(),
      employee_name: user ? user.name : 'Unknown'
    };
  });
}

async function getLeaveById(id) {
  const database = await getDatabase();
  
  if (database) {
    const leave = await database.collection('leaves').findOne({ _id: id });
    if (leave) {
      const user = await getUserById(leave.user_id);
      return {
        id: leave._id.toString(),
        user_id: leave.user_id?.toString(),
        leave_type: leave.leave_type,
        dates: Array.isArray(leave.dates) ? leave.dates : (leave.dates ? JSON.parse(leave.dates) : []),
        reason: leave.reason || '',
        status: leave.status,
        applied_at: leave.applied_at,
        updated_at: leave.updated_at,
        employee_name: user ? user.name : 'Unknown'
      };
    }
    return null;
  }

  // Fallback to memory
  const memDb = initMemoryDB();
  const leave = memDb.leaves.find(l => l.id.toString() === id.toString());
  if (leave) {
    const user = await getUserById(leave.user_id);
    return {
      ...leave,
      id: leave.id.toString(),
      user_id: leave.user_id.toString(),
      employee_name: user ? user.name : 'Unknown'
    };
  }
  return null;
}

async function createLeave(leaveData) {
  const database = await getDatabase();
  const { ObjectId } = require('mongodb');

  if (database) {
    // Convert user_id to ObjectId if it's a valid MongoDB ObjectId string
    let userId = leaveData.user_id;
    if (ObjectId.isValid(leaveData.user_id)) {
      try {
        userId = new ObjectId(leaveData.user_id);
      } catch (e) {
        // If conversion fails, use as string
        userId = leaveData.user_id;
      }
    }

    const leave = {
      user_id: userId,
      leave_type: leaveData.leave_type,
      dates: Array.isArray(leaveData.dates) ? leaveData.dates : [],
      reason: leaveData.reason || '',
      status: 'pending',
      applied_at: new Date(),
      updated_at: new Date()
    };

    const result = await database.collection('leaves').insertOne(leave);
    return {
      id: result.insertedId.toString(),
      user_id: userId.toString(),
      leave_type: leave.leave_type,
      dates: leave.dates,
      reason: leave.reason,
      status: leave.status,
      applied_at: leave.applied_at.toISOString(),
      updated_at: leave.updated_at.toISOString()
    };
  }

  // Fallback to memory
  const memDb = initMemoryDB();
  const leave = {
    id: memDb.nextLeaveId++,
    user_id: leaveData.user_id,
    leave_type: leaveData.leave_type,
    dates: Array.isArray(leaveData.dates) ? leaveData.dates : [],
    reason: leaveData.reason || '',
    status: 'pending',
    applied_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  memDb.leaves.push(leave);
  return leave;
}

async function updateLeaveStatus(id, status) {
  const database = await getDatabase();
  const { ObjectId } = require('mongodb');

  // Convert to ObjectId if it's a valid MongoDB ObjectId, otherwise use as string
  let queryId = id;
  if (database && ObjectId.isValid(id)) {
    try {
      queryId = new ObjectId(id);
    } catch (e) {
      queryId = id;
    }
  }

  if (database) {
    const result = await database.collection('leaves').updateOne(
      { _id: queryId },
      { 
        $set: { 
          status: status,
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return null;
    }

    const leave = await database.collection('leaves').findOne({ _id: queryId });
    if (leave) {
      return {
        id: leave._id.toString(),
        user_id: leave.user_id?.toString(),
        leave_type: leave.leave_type,
        dates: Array.isArray(leave.dates) ? leave.dates : (leave.dates ? JSON.parse(leave.dates) : []),
        reason: leave.reason || '',
        status: leave.status,
        applied_at: leave.applied_at,
        updated_at: leave.updated_at
      };
    }
    return null;
  }

  // Fallback to memory
  const memDb = initMemoryDB();
  const leave = memDb.leaves.find(l => l.id.toString() === id.toString());
  if (!leave) return null;
  leave.status = status;
  leave.updated_at = new Date().toISOString();
  return leave;
}

async function getStats() {
  const database = await getDatabase();
  let employees = [];
  let leaves = [];

  if (database) {
    employees = await getEmployees();
    leaves = await database.collection('leaves').find({}).toArray();
  } else {
    const memDb = initMemoryDB();
    employees = await getEmployees();
    leaves = memDb.leaves;
  }

  return {
    totalEmployees: employees.length,
    totalLeaves: leaves.length,
    pendingLeaves: leaves.filter(l => l.status === 'pending').length,
    approvedLeaves: leaves.filter(l => l.status === 'approved').length,
    rejectedLeaves: leaves.filter(l => l.status === 'rejected').length,
    leaveTypeBreakdown: {
      casual: leaves.filter(l => l.leave_type === 'casual').length,
      medical: leaves.filter(l => l.leave_type === 'medical').length,
      halfday: leaves.filter(l => l.leave_type === 'halfday').length,
      short: leaves.filter(l => l.leave_type === 'short').length
    }
  };
}

async function getEmployeeStats() {
  const employees = await getEmployees();
  const database = await getDatabase();
  let leaves = [];

  if (database) {
    leaves = await database.collection('leaves').find({}).toArray();
  } else {
    const memDb = initMemoryDB();
    leaves = memDb.leaves;
  }

  return employees.map(emp => {
    const empLeaves = leaves.filter(l => {
      const leaveUserId = l.user_id?.toString() || l.user_id;
      return leaveUserId === emp.id.toString();
    });
    
    return {
      id: emp.id.toString(),
      name: emp.name,
      total_leaves: empLeaves.length,
      approved_leaves: empLeaves.filter(l => l.status === 'approved').length,
      pending_leaves: empLeaves.filter(l => l.status === 'pending').length,
      casual_leaves: empLeaves.filter(l => l.leave_type === 'casual').length,
      medical_leaves: empLeaves.filter(l => l.leave_type === 'medical').length,
      halfday_leaves: empLeaves.filter(l => l.leave_type === 'halfday').length,
      short_leaves: empLeaves.filter(l => l.leave_type === 'short').length
    };
  });
}

module.exports = {
  getEmployees,
  getAllLeaves,
  getLeaveById,
  createLeave,
  updateLeaveStatus,
  getStats,
  getEmployeeStats
};

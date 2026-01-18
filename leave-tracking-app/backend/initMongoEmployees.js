// Script to initialize/add default employees to MongoDB
require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set!');
  console.error('Please create a .env file with: MONGODB_URI=your_connection_string');
  process.exit(1);
}

const defaultEmployees = [
  { name: 'Anudi', role: 'employee', created_at: new Date() },
  { name: 'Savindi', role: 'employee', created_at: new Date() },
  { name: 'Senaka', role: 'employee', created_at: new Date() },
  { name: 'Apsara', role: 'employee', created_at: new Date() }
];

async function initializeEmployees() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db('leave_tracker');
    const usersCollection = db.collection('users');
    
    console.log('📊 Checking existing employees...');
    const existingEmployees = await usersCollection.find({ role: 'employee' }).toArray();
    const existingNames = existingEmployees.map(e => e.name);
    
    console.log(`Found ${existingEmployees.length} existing employees:`, existingNames);
    
    // Find employees that don't exist yet
    const employeesToAdd = defaultEmployees.filter(emp => !existingNames.includes(emp.name));
    
    if (employeesToAdd.length === 0) {
      console.log('✅ All default employees already exist!');
      console.log('Employees:', existingNames.join(', '));
    } else {
      console.log(`➕ Adding ${employeesToAdd.length} new employees...`);
      const result = await usersCollection.insertMany(employeesToAdd);
      console.log(`✅ Successfully added ${result.insertedCount} employees!`);
      
      // Show all employees
      const allEmployees = await usersCollection.find({ role: 'employee' }).toArray();
      console.log('\n📋 All employees in database:');
      allEmployees.forEach(emp => {
        console.log(`  - ${emp.name} (ID: ${emp._id})`);
      });
    }
    
    console.log('\n✅ Done!');
    
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

initializeEmployees();

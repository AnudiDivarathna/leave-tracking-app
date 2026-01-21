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
  { name: 'Senaka Warnakumara', paysheet_number: '43026', role: 'employee', first_login: true, email: 'senakawarnakumara@gmail.com', password: null, created_at: new Date() },
  { name: 'Keerthi Illukumbura', paysheet_number: '43029', role: 'employee', first_login: true, email: 'physiokeerti@yahoo.com', password: null, created_at: new Date() },
  { name: 'Nayomi Kumari', paysheet_number: '43033', role: 'employee', first_login: true, email: 'nayomikumari199@gmail.com', password: null, created_at: new Date() },
  { name: 'Rohan Rathnayaka', paysheet_number: '43035', role: 'employee', first_login: true, email: 'rohanrathnayakephysio@gmail.com', password: null, created_at: new Date() },
  { name: 'Jayanath Wijayagunawardhana', paysheet_number: '43036', role: 'employee', first_login: true, email: 'jayanath2230474@gmail.com', password: null, created_at: new Date() },
  { name: 'Medha De Silva', paysheet_number: '43048', role: 'employee', first_login: true, email: 'dinashnirwan2020@gmail.com', password: null, created_at: new Date() },
  { name: 'Udula Padmawathi', paysheet_number: '43045', role: 'employee', first_login: true, email: 'udulapathma@gmail.com', password: null, created_at: new Date() },
  { name: 'Upul Kumara', paysheet_number: '43049', role: 'employee', first_login: true, email: 'upul0408@gmail.com', password: null, created_at: new Date() },
  { name: 'Rumesh Priyadharshana', paysheet_number: '43050', role: 'employee', first_login: true, email: 'rumeshphysio@gmail.com', password: null, created_at: new Date() },
  { name: 'Manoj Thennakoon', paysheet_number: '43054', role: 'employee', first_login: true, email: 'manojthenn86@gmail.com', password: null, created_at: new Date() },
  { name: 'Iraj Atapattu', paysheet_number: '43058', role: 'employee', first_login: true, email: 'cathapaththu59@gmail.com', password: null, created_at: new Date() },
  { name: 'Dulani Illukkumbura', paysheet_number: '43061', role: 'employee', first_login: true, email: 'dulani.ilukkumbura99@gmail.com', password: null, created_at: new Date() },
  { name: 'Sajith Abeygunawardhana', paysheet_number: '43062', role: 'employee', first_login: true, email: 'contact.physio.sajith@gmail.com', password: null, created_at: new Date() },
  { name: 'Kasuni Perera', paysheet_number: '43074', role: 'employee', first_login: true, email: 'kasun33a08@gmail.com', password: null, created_at: new Date() },
  { name: 'Dushmanthi Amarasingha', paysheet_number: '43075', role: 'employee', first_login: true, email: 'dushmanthi1989@gmail.com', password: null, created_at: new Date() },
  { name: 'Amali Kumari', paysheet_number: '43076', role: 'employee', first_login: true, email: 'jeevanisbsch@gmail.com', password: null, created_at: new Date() },
  { name: 'Indika Yatiwella', paysheet_number: '43077', role: 'employee', first_login: true, email: 'test@gmail.com', password: null, created_at: new Date() },
  { name: 'Nissanka Bandara', paysheet_number: '43078', role: 'employee', first_login: true, email: 'vmnnbandara@gmail.com', password: null, created_at: new Date() },
  { name: 'Jayanga Jayasooriya', paysheet_number: '43079', role: 'employee', first_login: true, email: 'jayangachan@gmail.com', password: null, created_at: new Date() },
  { name: 'Udari Thennakoon', paysheet_number: '43080', role: 'employee', first_login: true, email: 'udaritennakoon@gmail.com', password: null, created_at: new Date() },
  { name: 'Dulaj Suraweera', paysheet_number: '43081', role: 'employee', first_login: true, email: 'dulajsu@gmail.com', password: null, created_at: new Date() },
  { name: 'Indunil Kularathna', paysheet_number: '43082', role: 'employee', first_login: true, email: 'nindunilkularathne@gmail.com', password: null, created_at: new Date() },
  { name: 'Piumi Nakandala', paysheet_number: '43084', role: 'employee', first_login: true, email: 'nakandalap@gmail.com', password: null, created_at: new Date() },
  { name: 'Shashini Marasinghe', paysheet_number: '43087', role: 'employee', first_login: true, email: 'shashinimarasinghe93@gmail.com', password: null, created_at: new Date() },
  { name: 'Nuwan Bandaranayake', paysheet_number: '43089', role: 'employee', first_login: true, email: 'nuwanb78@gmail.com', password: null, created_at: new Date() },
  { name: 'Dilmini Dissanayaka', paysheet_number: '43090', role: 'employee', first_login: true, email: 'dilmini008.dd@gmail.com', password: null, created_at: new Date() },
  { name: 'K G P Maduwanthi', paysheet_number: '43091', role: 'employee', first_login: true, email: 'priyankamaduwanthi@gmail.com', password: null, created_at: new Date() },
  { name: 'M Farzan', paysheet_number: '43092', role: 'employee', first_login: true, email: 'farzan8886@gmail.com', password: null, created_at: new Date() },
  { name: 'Dhanushika Rathnamalala', paysheet_number: '43096', role: 'employee', first_login: true, email: 'rathnamalaladhanushika@gmail.com', password: null, created_at: new Date() },
  { name: 'Thilanka Dissanayaka', paysheet_number: '43097', role: 'employee', first_login: true, email: 'tndilhan@gmail.com', password: null, created_at: new Date() },
  { name: 'Farhan Mohomed', paysheet_number: '43098', role: 'employee', first_login: true, email: 'mffarhanm93@gmail.com', password: null, created_at: new Date() },
  { name: 'Erandi Alwis', paysheet_number: '43099', role: 'employee', first_login: true, email: 'nayomi21dealwis@gmail.com', password: null, created_at: new Date() },
  { name: 'Charika Dissanayake', paysheet_number: '43100', role: 'employee', first_login: true, email: 'dissanayake.charika@yahoo.com', password: null, created_at: new Date() },
  { name: 'Senaka Divarathne', paysheet_number: '43101', role: 'employee', first_login: true, email: 'sdivarathne@gmail.com', password: null, created_at: new Date() }
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
    console.log(`Found ${existingEmployees.length} existing employees`);
    
    // Delete ALL existing employees and start fresh
    if (existingEmployees.length > 0) {
      console.log('\n🗑️  Removing all existing employees to start fresh...');
      const deleteResult = await usersCollection.deleteMany({ role: 'employee' });
      console.log(`✅ Removed ${deleteResult.deletedCount} employees`);
    }
    
    // Add all production employees
    console.log(`\n➕ Adding ${defaultEmployees.length} production employees...`);
    const result = await usersCollection.insertMany(defaultEmployees);
    console.log(`✅ Successfully added ${result.insertedCount} employees!`);
    
    // Show all employees
    const allEmployees = await usersCollection.find({ role: 'employee' }).toArray();
    console.log(`\n📋 All employees in database (${allEmployees.length} total):`);
    allEmployees.forEach(emp => {
      const paysheetInfo = emp.paysheet_number ? ` [Paysheet: ${emp.paysheet_number}]` : '';
      console.log(`  - ${emp.name}${paysheetInfo}`);
    });
    
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

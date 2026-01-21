// Script to add authentication fields to existing employees in MongoDB
// Run with: node migrateAuth.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set!');
  console.error('Please create a .env file with: MONGODB_URI=your_connection_string');
  process.exit(1);
}

async function migrateAuth() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db('leave_tracker');
    const usersCollection = db.collection('users');
    
    console.log('📊 Checking existing employees...');
    const employees = await usersCollection.find({ role: 'employee' }).toArray();
    console.log(`Found ${employees.length} employees`);
    
    let updated = 0;
    
    // Email mapping by paysheet number
    const emailMap = {
      '43026': 'senakawarnakumara@gmail.com',
      '43029': 'physiokeerti@yahoo.com',
      '43033': 'nayomikumari199@gmail.com',
      '43035': 'rohanrathnayakephysio@gmail.com',
      '43036': 'jayanath2230474@gmail.com',
      '43045': 'udulapathma@gmail.com',
      '43048': 'dinashnirwan2020@gmail.com',
      '43049': 'upul0408@gmail.com',
      '43050': 'rumeshphysio@gmail.com',
      '43054': 'manojthenn86@gmail.com',
      '43058': 'cathapaththu59@gmail.com',
      '43061': 'dulani.ilukkumbura99@gmail.com',
      '43062': 'contact.physio.sajith@gmail.com',
      '43074': 'kasun33a08@gmail.com',
      '43075': 'dushmanthi1989@gmail.com',
      '43076': 'jeevanisbsch@gmail.com',
      '43078': 'vmnnbandara@gmail.com',
      '43079': 'jayangachan@gmail.com',
      '43080': 'udaritennakoon@gmail.com',
      '43081': 'dulajsu@gmail.com',
      '43082': 'nindunilkularathne@gmail.com',
      '43084': 'nakandalap@gmail.com',
      '43087': 'shashinimarasinghe93@gmail.com',
      '43089': 'nuwanb78@gmail.com',
      '43090': 'dilmini008.dd@gmail.com',
      '43091': 'priyankamaduwanthi@gmail.com',
      '43092': 'farzan8886@gmail.com',
      '43096': 'rathnamalaladhanushika@gmail.com',
      '43097': 'tndilhan@gmail.com',
      '43098': 'mffarhanm93@gmail.com',
      '43099': 'nayomi21dealwis@gmail.com',
      '43100': 'dissanayake.charika@yahoo.com',
      '43101': 'sdivarathne@gmail.com'
    };

    for (const emp of employees) {
      // Get email from mapping or use test@gmail.com as default
      const email = emailMap[emp.paysheet_number] || 'test@gmail.com';
      
      // Update employee with email and reset first_login
      await usersCollection.updateOne(
        { _id: emp._id },
        { 
          $set: { 
            first_login: true,
            email: email,
            password: null,
            updated_at: new Date()
          } 
        }
      );
      updated++;
      console.log(`  ✅ Updated: ${emp.name} (email: ${email})`);
    }
    
    console.log(`\n✅ Migration complete! Updated ${updated} employees.`);
    
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

migrateAuth();

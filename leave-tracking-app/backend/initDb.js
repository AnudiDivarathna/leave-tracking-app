const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'leave_tracker.db');

async function initDatabase() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'employee',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      leave_type TEXT NOT NULL,
      dates TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Initial employees - 4 for now, will add 34 real names later
  const employees = [
    'Anudi Divarathna',
    'Savindi Divarathna', 
    'Senaka Divarathna',
    'Apsara Divarathna'
  ];

  // Insert employees
  employees.forEach(name => {
    db.run(`INSERT INTO users (name, role) VALUES (?, ?)`, [name, 'employee']);
  });

  // Save to file
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);

  console.log('Database initialized successfully!');
  console.log('');
  console.log('Employees added:');
  employees.forEach(name => {
    console.log(`  - ${name}`);
  });
  console.log('');
  console.log('Leave types: casual, medical, halfday, short');

  db.close();
}

initDatabase().catch(console.error);

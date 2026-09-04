const { db, databasePath, initializeDatabase } = require('./database');

try {
  initializeDatabase();
  db.close();
  console.log(`Database initialized at ${databasePath}`);
} catch (error) {
  if (db.open) {
    db.close();
  }
  console.error('Database initialization failed:', error.message);
  process.exitCode = 1;
}
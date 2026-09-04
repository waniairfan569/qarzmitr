const { db, initializeDatabase } = require('./db/database');
const { env, validateEnvironment } = require('./config/env');

try {
  validateEnvironment();
  initializeDatabase();

  const app = require('./app');
  const server = app.listen(env.port, () => {
    console.log(`QarzMitr API listening on port ${env.port}`);
  });

  function shutdown() {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  }

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch (error) {
  console.error('Server startup failed:', error.message);
  process.exit(1);
}
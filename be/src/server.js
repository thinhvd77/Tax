const app = require('./app');
const databaseManager = require('./config/DatabaseManager');

const PORT = process.env.PORT || 3001;

databaseManager
  .initialize()
  .then(() => {
    console.log('✅ Database initialized successfully with TypeORM!');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log('❌ Database initialization error: ', error);
    process.exit(1);
  });

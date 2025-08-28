require('dotenv').config();
const { DataSource } = require('typeorm');
const path = require('path');

// This DataSource is for TypeORM CLI (migrations) only.
// Keep synchronize disabled for safe migration usage.

const host = process.env.PGHOST || process.env.POSTGRES_HOST || 'localhost';
const port = parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || '5432', 10);
const username = process.env.PGUSER || process.env.POSTGRES_USER || 'postgres';
const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '';
const database = process.env.PGDATABASE || process.env.POSTGRES_DB || 'thue_tncn';

const entitiesPath = path.join(__dirname, '..', 'entities', '*.entity.js');
const migrationsPath = path.join(__dirname, '..', 'migrations', '*.js');

module.exports = new DataSource({
  type: 'postgres',
  host,
  port,
  username,
  password,
  database,
  entities: [entitiesPath],
  migrations: [migrationsPath],
  synchronize: true, // For development; consider disabling in production
  logging: false,
});

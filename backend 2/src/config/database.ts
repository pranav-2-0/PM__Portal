import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'pm_alignment',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 50, // Increased for large dataset uploads (300K+ records)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Increased timeout for large queries
  statement_timeout: 300000, // 5 minutes for large bulk operations
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

export default pool;

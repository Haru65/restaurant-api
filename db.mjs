import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const useSsl = process.env.DATABASE_SSL === 'true'
  || (!process.env.DATABASE_SSL && process.env.NODE_ENV === 'production');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' } : false,
  max: 10,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err.message);
});

export const query = (text, params) => pool.query(text, params);
export default pool;

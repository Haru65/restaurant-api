import pool from '../db.mjs';

const statements = [
  `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS kitchen_printer_ip TEXT`,
  `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS kitchen_printer_port INTEGER DEFAULT 9100`,
  `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS counter_printer_ip TEXT`,
  `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS counter_printer_port INTEGER DEFAULT 9100`,
  `UPDATE restaurants SET kitchen_printer_port = 9100 WHERE kitchen_printer_port IS NULL`,
  `UPDATE restaurants SET counter_printer_port = 9100 WHERE counter_printer_port IS NULL`,
];

try {
  for (const statement of statements) {
    await pool.query(statement);
  }

  console.log('[MIGRATION] Printer settings columns are ready');
} catch (err) {
  console.error('[MIGRATION] Failed to add printer settings columns:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}

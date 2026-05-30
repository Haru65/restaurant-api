import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const menuCount = await pool.query("SELECT COUNT(*)::int AS count FROM menu");
  const orderCount = await pool.query("SELECT COUNT(*)::int AS count FROM orders");

  const recentMenu = await pool.query(
    "SELECT id, name, price, available FROM menu ORDER BY id DESC LIMIT 5",
  );

  const recentOrders = await pool.query(
    "SELECT id, items, total, status, created_at FROM orders ORDER BY id DESC LIMIT 5",
  );

  console.log(`menu_count=${menuCount.rows[0].count}`);
  console.log(`order_count=${orderCount.rows[0].count}`);
  console.log(`recent_menu=${JSON.stringify(recentMenu.rows)}`);
  console.log(`recent_orders=${JSON.stringify(recentOrders.rows)}`);

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

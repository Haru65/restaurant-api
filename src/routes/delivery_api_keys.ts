import fastifyPkg from 'fastify';
const { FastifyInstance } = fastifyPkg;
import pool from '../db.ts';

// Table: delivery_api_keys (id serial primary key, swiggy_key text, zomato_key text)

export default async function deliveryApiKeysRoutes(app: FastifyInstance) {
  // Get API keys (admin only)
  app.get('/delivery-api-keys', async (req, reply) => {
    // TODO: Add authentication/authorization
    const { rows } = await pool.query('SELECT swiggy_key, zomato_key FROM delivery_api_keys WHERE id = 1');
    if (rows.length === 0) return reply.send({ swiggy_key: '', zomato_key: '' });
    return reply.send(rows[0]);
  });

  // Update API keys (admin only)
  app.post('/delivery-api-keys', async (req, reply) => {
    // TODO: Add authentication/authorization
    const { swiggy_key, zomato_key } = req.body as { swiggy_key: string; zomato_key: string };
    await pool.query(
      `INSERT INTO delivery_api_keys (id, swiggy_key, zomato_key)
       VALUES (1, $1, $2)
       ON CONFLICT (id) DO UPDATE SET swiggy_key = $1, zomato_key = $2`,
      [swiggy_key, zomato_key]
    );
    return reply.send({ success: true });
  });
}

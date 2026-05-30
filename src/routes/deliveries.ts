import fastifyPkg from 'fastify';
const { FastifyInstance } = fastifyPkg;
import pool from '../db.ts';
import { z } from 'zod';

// Delivery table assumed: deliveries (id serial primary key, order_number text, customer_name text, phone text, address text, partner text, amount numeric, driver text, status text, created_at timestamp)

const DeliverySchema = z.object({
  orderNumber: z.string().min(1),
  customerName: z.string().min(1),
  phone: z.string().min(5),
  address: z.string().min(1),
  partner: z.enum(['in-house', 'swiggy', 'zomato']),
  amount: z.number().nonnegative(),
  driver: z.string().min(1),
  status: z.enum(['pending', 'dispatched', 'delivered']),
});

export default async function deliveriesRoutes(app: FastifyInstance) {
  // Get all deliveries
  app.get('/deliveries', async (req, reply) => {
    const { rows } = await pool.query('SELECT * FROM deliveries ORDER BY created_at DESC');
    reply.send(rows);
  });

  // Add a new delivery
  app.post('/deliveries', async (req, reply) => {
    const parsed = DeliverySchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'Invalid payload', details: parsed.error.flatten() };
    }
    const { orderNumber, customerName, phone, address, partner, amount, driver, status } = parsed.data;
    const result = await pool.query(
      `INSERT INTO deliveries (order_number, customer_name, phone, address, partner, amount, driver, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
      [orderNumber, customerName, phone, address, partner, amount, driver, status]
    );
    reply.code(201);
    reply.send(result.rows[0]);
  });

  // Update a delivery
  app.patch('/deliveries/:id', async (req, reply) => {
    const id = Number((req.params as any).id);
    if (!id) return reply.code(400).send({ error: 'Invalid id' });
    const fields = Object.keys(req.body);
    if (fields.length === 0) return reply.code(400).send({ error: 'No fields to update' });
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values = fields.map(f => req.body[f]);
    const result = await pool.query(
      `UPDATE deliveries SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );
    if (result.rows.length === 0) return reply.code(404).send({ error: 'Not found' });
    reply.send(result.rows[0]);
  });

  // Delete a delivery
  app.delete('/deliveries/:id', async (req, reply) => {
    const id = Number((req.params as any).id);
    if (!id) return reply.code(400).send({ error: 'Invalid id' });
    await pool.query('DELETE FROM deliveries WHERE id = $1', [id]);
    reply.send({ success: true });
  });
}

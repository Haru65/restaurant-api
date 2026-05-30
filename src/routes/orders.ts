import fastifyPkg from 'fastify';
const { FastifyInstance } = fastifyPkg;
import pool from '../db.ts';
import { z } from 'zod';
import { requireRoles } from '../middleware/auth.ts';

const CreateOrderSchema = z.object({
  userId: z.number().int().positive(),
  items: z.array(z.string().min(1)).min(1),
  total: z.number().positive(),
  orderType: z.enum(['dine-in', 'take-away']),
  paymentMethod: z.enum(['upi', 'cash', 'card', 'paytm']),
  table_number: z.number().int().positive().nullable().optional(),
});

const UpdateOrderSchema = z
  .object({
    items: z.array(z.string().min(1)).min(1).optional(),
    total: z.number().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

const parseId = (value: string) => Number(value);

export default async function orderRoutes(app: FastifyInstance) {
    // Payment summary endpoint
    app.get('/orders/payment-summary', { preHandler: requireRoles(['admin', 'superadmin']) }, async () => {
      // Group by status, sum totals and count orders
      const result = await pool.query(`
        SELECT 
          status,
          COUNT(*) AS order_count,
          SUM(total) AS total_amount
        FROM orders
        GROUP BY status
        ORDER BY status
      `);
      return result.rows;
    });
  // Get all orders
  app.get('/orders', { preHandler: requireRoles(['admin', 'superadmin']) }, async () => {
    const result = await pool.query('SELECT * FROM orders');
    return result.rows;
  });

  // Add a new order
  app.post('/orders', { preHandler: requireRoles(['admin', 'superadmin']) }, async (request, reply) => {
    const parsed = CreateOrderSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'Invalid payload', details: parsed.error.flatten() };
    }

    const { userId, items, total, orderType, paymentMethod, table_number } = parsed.data;
    try {
      const result = await pool.query(
        'INSERT INTO orders (user_id, items, total, status, table_number) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userId, items, total, 'pending', table_number ?? null],
      );
      reply.code(201);
      return result.rows[0];
    } catch (err: any) {
      reply.code(400);
      return { error: err.message };
    }
  });

  // Get order by ID
  app.get('/orders/:id', { preHandler: requireRoles(['admin', 'superadmin']) }, async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (!Number.isInteger(id) || id <= 0) {
      reply.code(400);
      return { error: 'Invalid order id' };
    }

    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      reply.code(404);
      return { error: 'Order not found' };
    }
    return result.rows[0];
  });

  // Update order by ID
  app.put('/orders/:id', { preHandler: requireRoles(['admin', 'superadmin']) }, async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (!Number.isInteger(id) || id <= 0) {
      reply.code(400);
      return { error: 'Invalid order id' };
    }

    const parsed = UpdateOrderSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'Invalid payload', details: parsed.error.flatten() };
    }

    const { items, total } = parsed.data;
    const fields = [];
    const values = [];
    if (items) { fields.push('items'); values.push(items); }
    if (total !== undefined) { fields.push('total'); values.push(total); }
    if (fields.length === 0) {
      reply.code(400);
      return { error: 'No fields to update' };
    }
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    values.push(id);
    const result = await pool.query(
      `UPDATE orders SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
      values,
    );
    if (result.rows.length === 0) {
      reply.code(404);
      return { error: 'Order not found' };
    }
    return result.rows[0];
  });

  // Delete order by ID
  app.delete('/orders/:id', { preHandler: requireRoles(['admin', 'superadmin']) }, async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (!Number.isInteger(id) || id <= 0) {
      reply.code(400);
      return { error: 'Invalid order id' };
    }

    const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      reply.code(404);
      return { error: 'Order not found' };
    }
    return { success: true };
  });
}

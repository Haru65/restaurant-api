import fastifyPkg from 'fastify';
const { FastifyInstance } = fastifyPkg;
import pool from '../db.ts';
// import { requireRoles } from '../middleware/auth';
import { z } from 'zod';

const TableSchema = z.object({
  table_number: z.number().int().positive(),
  capacity: z.number().int().positive(),
  section: z.string().min(1),
  status: z.enum(['available', 'occupied', 'reserved', 'maintenance']).default('available'),
});

export default async function tableRoutes(app: FastifyInstance) {
  // Get all tables
  app.get('/tables', async () => {
    const result = await pool.query('SELECT * FROM restaurant_tables ORDER BY table_number');
    return result.rows;
  });

  // Add a new table
  app.post('/tables', /*{ preHandler: requireRoles(['admin', 'superadmin']) },*/ async (request, reply) => {
    const parsed = TableSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'Invalid payload', details: parsed.error.flatten() };
    }
    const { table_number, capacity, section, status } = parsed.data;
    try {
      const result = await pool.query(
        'INSERT INTO restaurant_tables (table_number, capacity, section, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [table_number, capacity, section, status]
      );
      reply.code(201);
      return result.rows[0];
    } catch (err: any) {
      reply.code(400);
      return { error: err.message };
    }
  });

  // Update a table
  app.put('/tables/:id', /*{ preHandler: requireRoles(['admin', 'superadmin']) },*/ async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id) || id <= 0) {
      reply.code(400);
      return { error: 'Invalid table id' };
    }
    const parsed = TableSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'Invalid payload', details: parsed.error.flatten() };
    }
    const fields = Object.keys(parsed.data);
    if (fields.length === 0) {
      reply.code(400);
      return { error: 'No fields to update' };
    }
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values = fields.map(f => (parsed.data as any)[f]);
    values.push(id);
    try {
      const result = await pool.query(
        `UPDATE restaurant_tables SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
        values
      );
      if (result.rows.length === 0) {
        reply.code(404);
        return { error: 'Table not found' };
      }
      return result.rows[0];
    } catch (err: any) {
      reply.code(400);
      return { error: err.message };
    }
  });

  // Delete a table
  app.delete('/tables/:id', /*{ preHandler: requireRoles(['admin', 'superadmin']) },*/ async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id) || id <= 0) {
      reply.code(400);
      return { error: 'Invalid table id' };
    }
    try {
      const result = await pool.query('DELETE FROM restaurant_tables WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) {
        reply.code(404);
        return { error: 'Table not found' };
      }
      return { success: true };
    } catch (err: any) {
      reply.code(400);
      return { error: err.message };
    }
  });
}

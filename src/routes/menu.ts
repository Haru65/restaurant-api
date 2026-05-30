import path from 'path';
import fs from 'fs';
import fastifyPkg from 'fastify';
const { FastifyInstance } = fastifyPkg;
import pool from '../db.ts';
import { z } from 'zod';
import { requireRoles } from '../middleware/auth.ts';

const MenuItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1).optional(),
  price: z.number().positive(),
  available: z.boolean(),
  image_url: z.string().url().optional(),
});

export default async function menuRoutes(app: FastifyInstance) {
  // Image upload endpoint
  app.post('/menu/image', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      reply.code(400);
      return { error: 'No file uploaded' };
    }
    const ext = path.extname(data.filename).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      reply.code(400);
      return { error: 'Invalid file type' };
    }
    const fileName = `${Date.now()}-${data.filename.replace(/[^a-zA-Z0-9.]/g, '')}`;
    const savePath = path.join(__dirname, '../../public/images', fileName);
    await fs.promises.writeFile(savePath, await data.toBuffer());
    const url = `/images/${fileName}`;
    return { url };
  });
  // Get all menu items
  app.get('/menu', async () => {
    const result = await pool.query('SELECT * FROM menu');
    // Always return a consistent object structure with image_url
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      price: row.price,
      available: row.available,
      image_url: row.image_url || '',
    }));
  });

  // Add a new menu item
  app.post('/menu', { preHandler: requireRoles(['admin', 'superadmin']) }, async (request, reply) => {
    const parsed = MenuItemSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'Invalid payload', details: parsed.error.flatten() };
    }
    const { name, category, price, available, image_url } = parsed.data;
    try {
      const result = await pool.query(
        'INSERT INTO menu (name, price, available, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, price, available, image_url || null],
      );
      // Always include image_url in the response, even if null
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        price: row.price,
        available: row.available,
        image_url: row.image_url || '',
      };
    } catch (err) {
      reply.code(500);
      return { error: 'Failed to add menu item', details: err };
    }
  });

  // Update a menu item
  app.put('/menu/:id', { preHandler: requireRoles(['admin', 'superadmin']) }, async (request, reply) => {
    const id = Number(request.params.id);
    const parsed = MenuItemSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'Invalid payload', details: parsed.error.flatten() };
    }
    const fields = parsed.data;
    const updates = Object.keys(fields).map((k, i) => `${k} = $${i + 1}`);
    const values = Object.values(fields);
    if (!updates.length) {
      reply.code(400);
      return { error: 'No fields to update' };
    }
    try {
      const result = await pool.query(
        `UPDATE menu SET ${updates.join(', ')} WHERE id = $${updates.length + 1} RETURNING *`,
        [...values, id],
      );
      if (result.rowCount === 0) {
        reply.code(404);
        return { error: 'Menu item not found' };
      }
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        price: row.price,
        available: row.available,
        image_url: row.image_url || '',
      };
    } catch (err) {
      reply.code(500);
      return { error: 'Failed to update menu item', details: err };
    }
  });

  // Delete a menu item
  app.delete('/menu/:id', { preHandler: requireRoles(['admin', 'superadmin']) }, async (request, reply) => {
    const id = Number(request.params.id);
    try {
      const result = await pool.query('DELETE FROM menu WHERE id = $1 RETURNING *', [id]);
      if (result.rowCount === 0) {
        reply.code(404);
        return { error: 'Menu item not found' };
      }
      return { success: true };
    } catch (err) {
      reply.code(500);
      return { error: 'Failed to delete menu item', details: err };
    }
  });
}

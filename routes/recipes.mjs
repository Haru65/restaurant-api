import { Router } from 'express';
import { query } from '../db.mjs';
import { authenticate } from '../middleware/auth.mjs';

const router = Router();
const scopedRestaurantId = (req) => req.user.role === 'superadmin' ? null : Number(req.user.restaurantId) || -1;

router.get('/recipes', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM recipes WHERE ($1::int IS NULL OR restaurant_id=$1) ORDER BY id DESC`,
      [scopedRestaurantId(req)]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/recipes', authenticate, async (req, res) => {
  try {
    const { name, category, prepTime, prep_time, stock, image, ingredients, restaurantId } = req.body;
    const targetRestaurantId = scopedRestaurantId(req) || Number(restaurantId);
    const preparationTime = Number(prepTime ?? prep_time);
    if (!targetRestaurantId || !name || !category || !preparationTime) {
      return res.status(400).json({ error: 'restaurantId, name, category and prepTime required' });
    }
    const { rows } = await query(
      `INSERT INTO recipes (restaurant_id, name, category, prep_time, stock, image, ingredients)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [targetRestaurantId, name.trim(), category.trim(), preparationTime, stock || 'Available', image || '', ingredients || '']
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(err.code === '23505' ? 409 : 500).json({ error: err.code === '23505' ? 'Recipe already exists' : err.message }); }
});

router.patch('/recipes/:id', authenticate, async (req, res) => {
  try {
    const { name, category, prepTime, prep_time, stock, image, ingredients } = req.body;
    const preparationTime = prepTime ?? prep_time;
    const { rows } = await query(
      `UPDATE recipes SET
       name=COALESCE($1,name), category=COALESCE($2,category), prep_time=COALESCE($3,prep_time),
       stock=COALESCE($4,stock), image=COALESCE($5,image), ingredients=COALESCE($6,ingredients), updated_at=NOW()
       WHERE id=$7 AND ($8::int IS NULL OR restaurant_id=$8) RETURNING *`,
      [name, category, preparationTime === undefined ? null : Number(preparationTime), stock, image, ingredients, req.params.id, scopedRestaurantId(req)]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/recipes/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM recipes WHERE id=$1 AND ($2::int IS NULL OR restaurant_id=$2)`,
      [req.params.id, scopedRestaurantId(req)]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

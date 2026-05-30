import { Router } from 'express';
import { query } from '../db.mjs';
import { authenticate } from '../middleware/auth.mjs';

const router = Router();

router.get('/tables', authenticate, async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM tables WHERE restaurant_id=$1 ORDER BY table_number`, [req.user.restaurantId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/tables', authenticate, async (req, res) => {
  try {
    const { table_number, capacity, section } = req.body;
    if (!table_number || !capacity || !section) return res.status(400).json({ error: 'table_number, capacity, section required' });
    const { rows } = await query(
      `INSERT INTO tables (restaurant_id, table_number, capacity, section, status) VALUES ($1,$2,$3,$4,'available') RETURNING *`,
      [req.user.restaurantId, Number(table_number), Number(capacity), section]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/tables/:id', authenticate, async (req, res) => {
  try {
    const { status, current_order, reserved_by, estimated_time } = req.body;
    const { rows } = await query(
      `UPDATE tables SET status=COALESCE($1,status), current_order=$2, reserved_by=$3, estimated_time=$4
       WHERE id=$5 AND restaurant_id=$6 RETURNING *`,
      [status, current_order ?? null, reserved_by ?? null, estimated_time ?? null, req.params.id, req.user.restaurantId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/tables/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const { rows } = await query(
      `UPDATE tables SET status=$1 WHERE id=$2 AND restaurant_id=$3 RETURNING *`,
      [status, req.params.id, req.user.restaurantId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/tables/:id', authenticate, async (req, res) => {
  try {
    await query(`DELETE FROM tables WHERE id=$1 AND restaurant_id=$2`, [req.params.id, req.user.restaurantId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

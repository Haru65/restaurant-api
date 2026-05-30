import { Router } from 'express';
import { query } from '../db.mjs';
import { authenticate } from '../middleware/auth.mjs';

const router = Router();

router.get('/deliveries', authenticate, async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM deliveries WHERE restaurant_id=$1 ORDER BY created_at DESC`, [req.user.restaurantId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/deliveries', authenticate, async (req, res) => {
  try {
    const { order_number, customer_name, phone, address, partner, amount, driver, status } = req.body;
    if (!order_number || !customer_name || !address) return res.status(400).json({ error: 'Required fields missing' });
    const { rows } = await query(
      `INSERT INTO deliveries (restaurant_id, order_number, customer_name, phone, address, partner, amount, driver, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.restaurantId, order_number.toUpperCase(), customer_name.trim(), phone || '', address.trim(), partner || 'in-house', Number(amount || 0), driver || 'Unassigned', status || 'pending']
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/deliveries/:id', authenticate, async (req, res) => {
  try {
    const { order_number, customer_name, phone, address, partner, amount, driver, status } = req.body;
    const { rows } = await query(
      `UPDATE deliveries SET order_number=COALESCE($1,order_number), customer_name=COALESCE($2,customer_name),
       phone=COALESCE($3,phone), address=COALESCE($4,address), partner=COALESCE($5,partner),
       amount=COALESCE($6,amount), driver=COALESCE($7,driver), status=COALESCE($8,status)
       WHERE id=$9 AND restaurant_id=$10 RETURNING *`,
      [order_number, customer_name, phone, address, partner, amount ? Number(amount) : null, driver, status, req.params.id, req.user.restaurantId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/deliveries/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const { rows } = await query(
      `UPDATE deliveries SET status=$1 WHERE id=$2 AND restaurant_id=$3 RETURNING *`,
      [status, req.params.id, req.user.restaurantId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/deliveries/:id', authenticate, async (req, res) => {
  try {
    await query(`DELETE FROM deliveries WHERE id=$1 AND restaurant_id=$2`, [req.params.id, req.user.restaurantId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

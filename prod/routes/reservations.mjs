import { Router } from 'express';
import { query } from '../db.mjs';
import { authenticate } from '../middleware/auth.mjs';
import crypto from 'crypto';

const router = Router();

// Generate a unique token for public reservation link
router.post('/reservations/public/generate', authenticate, async (req, res) => {
  try {
    const token = crypto.randomBytes(16).toString('hex');
    const { rows } = await query(
      `INSERT INTO reservation_tokens (restaurant_id, token, created_at)
       VALUES ($1, $2, NOW()) RETURNING token`,
      [req.user.restaurantId, token]
    );
    res.json({ token: rows[0].token });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get restaurant info from public token
router.get('/reservations/public/:token', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT r.id, r.name as restaurant_name FROM reservation_tokens rt
       JOIN restaurants r ON rt.restaurant_id = r.id
       WHERE rt.token = $1`,
      [req.params.token]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Invalid token' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get all reservations for authenticated user
router.get('/reservations', authenticate, async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM reservations WHERE restaurant_id=$1 ORDER BY created_at DESC`, [req.user.restaurantId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create reservation (from public link or authenticated)
router.post('/reservations', async (req, res) => {
  try {
    const { customer_name, customer_phone, reservation_date, reservation_time, guests, table_number, status, token, source } = req.body;
    
    if (!customer_name || !customer_phone || !reservation_date || !reservation_time) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // If from public link, verify token and get restaurant_id
    let restaurantId;
    if (source === 'public_link' && token) {
      const { rows: tokenRows } = await query(
        `SELECT restaurant_id FROM reservation_tokens WHERE token = $1`,
        [token]
      );
      if (!tokenRows[0]) return res.status(401).json({ error: 'Invalid token' });
      restaurantId = tokenRows[0].restaurant_id;
    } else if (req.user) {
      restaurantId = req.user.restaurantId;
    } else {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rows } = await query(
      `INSERT INTO reservations (restaurant_id, customer_name, customer_phone, reservation_date, reservation_time, guests, table_number, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [restaurantId, customer_name.trim(), customer_phone.trim(), reservation_date, reservation_time, Number(guests || 1), table_number || 'T1', status || 'pending']
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update reservation
router.put('/reservations/:id', authenticate, async (req, res) => {
  try {
    const { customer_name, customer_phone, reservation_date, reservation_time, guests, table_number, status } = req.body;
    const { rows } = await query(
      `UPDATE reservations SET customer_name=COALESCE($1,customer_name), customer_phone=COALESCE($2,customer_phone),
       reservation_date=COALESCE($3,reservation_date), reservation_time=COALESCE($4,reservation_time),
       guests=COALESCE($5,guests), table_number=COALESCE($6,table_number), status=COALESCE($7,status)
       WHERE id=$8 AND restaurant_id=$9 RETURNING *`,
      [customer_name, customer_phone, reservation_date, reservation_time, guests ? Number(guests) : null, table_number, status, req.params.id, req.user.restaurantId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update reservation status
router.patch('/reservations/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const { rows } = await query(
      `UPDATE reservations SET status=$1 WHERE id=$2 AND restaurant_id=$3 RETURNING *`,
      [status, req.params.id, req.user.restaurantId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete reservation
router.delete('/reservations/:id', authenticate, async (req, res) => {
  try {
    await query(`DELETE FROM reservations WHERE id=$1 AND restaurant_id=$2`, [req.params.id, req.user.restaurantId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

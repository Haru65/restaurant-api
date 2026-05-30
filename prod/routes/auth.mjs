import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.mjs';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const result = await query(
      `SELECT u.*, r.name as restaurant_name_from_db FROM users u
       LEFT JOIN restaurants r ON u.restaurant_id = r.id
       WHERE LOWER(u.email) = LOWER($1) AND u.is_active = TRUE`,
      [email.trim()]
    );

    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (role && user.role !== role) return res.status(401).json({ error: 'Invalid credentials' });

    // Check if restaurant is active (for non-superadmin users)
    if (user.restaurant_id && user.role !== 'superadmin') {
      const restCheck = await query(`SELECT status FROM restaurants WHERE id=$1`, [user.restaurant_id]);
      if (restCheck.rows[0] && restCheck.rows[0].status === 'Inactive') {
        return res.status(403).json({ error: 'Your restaurant account has been deactivated. Please contact support.' });
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, restaurantId: user.restaurant_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurant_id,
        restaurantName: user.restaurant_name || user.restaurant_name_from_db,
        mustChangePassword: user.must_change_password || false,
      },
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/profile', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user data from DB
    const userRes = await query(`SELECT id, name, email, role, restaurant_id FROM users WHERE id=$1`, [decoded.id]);
    if (!userRes.rows[0]) return res.status(404).json({ error: 'User not found' });
    const user = userRes.rows[0];

    let restaurantName = null, restaurantLogo = null;
    if (user.restaurant_id) {
      const r = await query(`SELECT name, logo_url FROM restaurants WHERE id = $1`, [user.restaurant_id]);
      if (r.rows[0]) { restaurantName = r.rows[0].name; restaurantLogo = r.rows[0].logo_url; }
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurant_id,
      restaurantName,
      restaurantLogo,
    });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Update own profile (name)
router.put('/profile', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });
    const { rows } = await query(`UPDATE users SET name=$1 WHERE id=$2 RETURNING id, name, email, role`, [name.trim(), decoded.id]);
    res.json(rows[0]);
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

// Change own password
router.post('/profile/change-password', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const userRes = await query(`SELECT password_hash FROM users WHERE id=$1`, [decoded.id]);
    if (!userRes.rows[0]) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await query(`UPDATE users SET password_hash=$1, must_change_password=FALSE WHERE id=$2`, [hash, decoded.id]);
    res.json({ success: true });
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

export default router;

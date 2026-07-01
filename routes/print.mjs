import { Router } from 'express';
import { query } from '../db.mjs';
import { authenticate } from '../middleware/auth.mjs';
import { buildBluetoothPrintReceipt } from '../services/bluetoothPrintReceiptBuilder.mjs';
import { generatePrintToken, verifyPrintToken } from '../utils/printToken.mjs';

const router = Router();
const SCHEME = 'my.bluetoothprint.scheme://';

function requestBaseUrl(req) {
  const configured = process.env.PUBLIC_API_BASE_URL;
  if (configured) return configured.replace(/\/+$/, '');

  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${protocol}://${host}`;
}

async function loadOrderForUser(orderId, user) {
  const restaurantId = user.role === 'superadmin' ? null : Number(user.restaurantId) || -1;
  const { rows } = await query(
    `SELECT o.*, r.name AS restaurant_name, r.address, r.phone, r.tax_rate
     FROM orders o
     JOIN restaurants r ON r.id = o.restaurant_id
     WHERE o.id=$1 AND ($2::int IS NULL OR o.restaurant_id=$2)
     LIMIT 1`,
    [orderId, restaurantId]
  );
  return rows[0] || null;
}

async function loadOrderForToken(orderId, tenantId) {
  const { rows } = await query(
    `SELECT o.*, r.name AS restaurant_name, r.address, r.phone, r.tax_rate
     FROM orders o
     JOIN restaurants r ON r.id = o.restaurant_id
     WHERE o.id=$1 AND o.restaurant_id=$2
     LIMIT 1`,
    [orderId, tenantId]
  );
  return rows[0] || null;
}

function restaurantFromRow(row) {
  return {
    id: row.restaurant_id,
    name: row.restaurant_name,
    address: row.address,
    phone: row.phone,
    tax_rate: row.tax_rate
  };
}

function normalizeOrder(row) {
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    order_number: row.order_number,
    table_number: row.table_number,
    items: Array.isArray(row.items) ? row.items : [],
    total: Number(row.total || 0),
    status: row.status,
    order_type: row.order_type,
    payment_status: row.payment_status,
    payment_method: row.payment_method,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function sendReceipt(res, row) {
  const receipt = buildBluetoothPrintReceipt(normalizeOrder(row), restaurantFromRow(row));
  res.type('application/json').json(receipt);
}

router.post('/api/print/orders/:orderId/bluetooth-url', authenticate, async (req, res) => {
  try {
    const order = await loadOrderForUser(req.params.orderId, req.user);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const token = generatePrintToken({
      orderId: order.id,
      tenantId: order.restaurant_id,
      userId: req.user.id
    });

    const jsonEndpoint = `${requestBaseUrl(req)}/api/print/orders/${order.id}/bluetooth?token=${encodeURIComponent(token)}`;
    res.json({
      success: true,
      printUrl: `${SCHEME}${jsonEndpoint}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/print/orders/:orderId/bluetooth', async (req, res) => {
  try {
    const token = String(req.query.token || '');
    if (!token) return res.status(401).json({ error: 'Print token required' });

    const payload = verifyPrintToken(token);
    if (String(payload.orderId) !== String(req.params.orderId)) {
      return res.status(403).json({ error: 'Print token does not match this order' });
    }

    const order = await loadOrderForToken(payload.orderId, payload.tenantId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    sendReceipt(res, order);
  } catch (err) {
    const status = err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError' ? 401 : 400;
    res.status(status).json({ error: err.message || 'Invalid print token' });
  }
});

router.get('/api/print/orders/:orderId/bluetooth-preview', authenticate, async (req, res) => {
  try {
    const order = await loadOrderForUser(req.params.orderId, req.user);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    sendReceipt(res, order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

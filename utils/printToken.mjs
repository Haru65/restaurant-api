import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const getSecret = () => process.env.PRINT_TOKEN_SECRET || process.env.JWT_SECRET;

const getExpirySeconds = () => {
  const seconds = Number(process.env.PRINT_TOKEN_EXPIRY_SECONDS || 120);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 120;
};

export function generatePrintToken({ orderId, tenantId, userId }) {
  const secret = getSecret();
  if (!secret) {
    throw new Error('PRINT_TOKEN_SECRET or JWT_SECRET is required to create print tokens');
  }

  return jwt.sign(
    {
      purpose: 'bluetooth-print',
      orderId: String(orderId),
      tenantId: String(tenantId),
      userId: userId == null ? null : String(userId)
    },
    secret,
    { expiresIn: getExpirySeconds() }
  );
}

export function verifyPrintToken(token) {
  const secret = getSecret();
  if (!secret) {
    throw new Error('PRINT_TOKEN_SECRET or JWT_SECRET is required to verify print tokens');
  }

  const payload = jwt.verify(token, secret);
  if (payload?.purpose !== 'bluetooth-print') {
    throw new Error('Invalid print token purpose');
  }
  if (!payload.orderId || !payload.tenantId) {
    throw new Error('Invalid print token payload');
  }

  return payload;
}

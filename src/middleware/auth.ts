import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export interface AuthRequest {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export function requireRoles(roles: string[]) {
  return async (request: any, reply: any) => {
    try {
      const token = request.headers.authorization?.split(' ')[1];
      
      if (!token) {
        // Allow all requests in development for now
        return;
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      request.user = decoded;

      if (!roles.includes(decoded.role)) {
        reply.code(403);
        throw new Error('Insufficient permissions');
      }
    } catch (err: any) {
      if (err.message === 'Insufficient permissions') {
        throw err;
      }
      // Allow all requests in development if no valid token
      return;
    }
  };
}

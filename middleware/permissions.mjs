/**
 * Permission Middleware for RBAC
 * Checks user permissions before allowing API access
 */

// Define role-based permissions
const rolePermissions = {
  superadmin: {
    // Super admin can access everything
    users: ['GET', 'POST', 'PATCH', 'DELETE'],
    restaurants: ['GET', 'POST', 'PATCH', 'DELETE'],
    subscriptions: ['GET', 'POST', 'PATCH', 'DELETE'],
    analytics: ['GET'],
    revenue: ['GET'],
  },
  admin: {
    // Admin can manage their restaurant's data
    menu: ['GET', 'POST', 'PUT', 'DELETE'],
    orders: ['GET', 'POST', 'PUT', 'PATCH'],
    reservations: ['GET', 'POST', 'PATCH'],
    tables: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    inventory: ['GET', 'POST', 'PATCH'],
    staff: ['GET', 'POST', 'PATCH', 'DELETE'],
    payroll: ['GET', 'POST', 'PATCH'],
    reports: ['GET'],
    payments: ['GET'],
    deliveries: ['GET', 'POST', 'PATCH'],
    crm: ['GET', 'POST', 'PATCH', 'DELETE'],
    users: ['GET', 'POST', 'PATCH'], // Can manage users in their restaurant
  },
  manager: {
    // Manager can view and manage operations (no financial data)
    menu: ['GET', 'POST', 'PUT'],
    orders: ['GET', 'POST', 'PUT', 'PATCH'],
    reservations: ['GET', 'POST', 'PATCH'],
    tables: ['GET', 'POST', 'PUT', 'PATCH'],
    inventory: ['GET', 'PATCH'],
    staff: ['GET', 'PATCH'],
    payroll: ['GET', 'PATCH'],
    deliveries: ['GET', 'PATCH'],
    crm: ['GET', 'PATCH'],
    // NO access to: reports, payments, revenue, analytics
  },
  staff: {
    // Staff can only view orders and kitchen display
    orders: ['GET'],
    tables: ['GET'],
    menu: ['GET'],
    // NO access to: create, update, delete, financial data
  },
};

/**
 * Extract user info from request
 * In a real app, this would decode JWT token
 */
export function extractUser(req) {
  // For now, we'll extract from a custom header
  // In production, decode JWT from Authorization header
  const authHeader = req.headers.authorization || '';
  
  console.log(`[EXTRACT_USER] Authorization header: ${authHeader}`);
  
  // Parse token format: "Bearer token_role_restaurant_id_timestamp"
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log(`[EXTRACT_USER] Token: ${token}`);
    const parts = token.split('_');
    console.log(`[EXTRACT_USER] Token parts: ${JSON.stringify(parts)}`);
    if (parts.length >= 3) {
      const user = {
        role: parts[1],
        restaurant_id: parseInt(parts[2], 10),
        token: token,
      };
      console.log(`[EXTRACT_USER] ✅ Extracted user: role=${user.role}, restaurant_id=${user.restaurant_id}`);
      return user;
    }
  }
  
  console.log(`[EXTRACT_USER] ❌ Failed to extract user from header`);
  return null;
}

/**
 * Check if user has permission for resource and method
 */
export function hasPermission(user, resource, method) {
  if (!user || !user.role) {
    return false;
  }

  const permissions = rolePermissions[user.role];
  if (!permissions) {
    return false;
  }

  const resourcePermissions = permissions[resource];
  if (!resourcePermissions) {
    return false;
  }

  return resourcePermissions.includes(method);
}

/**
 * Permission check middleware
 * Returns true if allowed, false if denied
 */
export function checkPermission(resource, method) {
  return (req) => {
    const user = extractUser(req);
    
    if (!user) {
      console.log(`[PERMISSION] No user found in request`);
      return false;
    }

    const allowed = hasPermission(user, resource, method);
    
    if (!allowed) {
      console.log(`[PERMISSION] ❌ Denied: ${user.role} cannot ${method} ${resource}`);
    } else {
      console.log(`[PERMISSION] ✅ Allowed: ${user.role} can ${method} ${resource}`);
    }

    return allowed;
  };
}

/**
 * Get resource name from path
 * Examples:
 *   /menu -> menu
 *   /orders -> orders
 *   /api/inventory -> inventory
 */
export function getResourceFromPath(path) {
  // Remove /api prefix if present
  let cleanPath = path.replace(/^\/api/, '');
  
  // Get first segment
  const segments = cleanPath.split('/').filter(s => s);
  if (segments.length === 0) return null;
  
  return segments[0];
}

/**
 * Get HTTP method from request
 */
export function getMethodFromRequest(req) {
  return req.method || 'GET';
}

/**
 * Main permission check function for use in server
 */
export function requirePermission(resource, method) {
  return (req) => {
    const user = extractUser(req);
    
    if (!user) {
      return { allowed: false, reason: 'No authentication token' };
    }

    const allowed = hasPermission(user, resource, method);
    
    return {
      allowed,
      user,
      reason: allowed ? 'Permission granted' : `${user.role} cannot ${method} ${resource}`,
    };
  };
}

export default {
  extractUser,
  hasPermission,
  checkPermission,
  getResourceFromPath,
  getMethodFromRequest,
  requirePermission,
  rolePermissions,
};

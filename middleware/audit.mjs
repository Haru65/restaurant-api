/**
 * Audit Logging Middleware
 * Logs all user actions for compliance and debugging
 */

const auditLogs = [];
let nextAuditId = 1;

/**
 * Log an action
 */
export function logAction(user, action, resource, details = {}) {
  const log = {
    id: nextAuditId++,
    timestamp: new Date().toISOString(),
    user_id: user?.id,
    user_role: user?.role,
    user_email: user?.email,
    action,
    resource,
    details,
    status: 'success',
  };

  auditLogs.push(log);
  console.log(`[AUDIT] ${user?.role || 'unknown'} ${action} ${resource}`, details);

  return log;
}

/**
 * Log a permission denial
 */
export function logDenial(user, action, resource, reason = '') {
  const log = {
    id: nextAuditId++,
    timestamp: new Date().toISOString(),
    user_id: user?.id,
    user_role: user?.role,
    user_email: user?.email,
    action,
    resource,
    status: 'denied',
    reason,
  };

  auditLogs.push(log);
  console.log(`[AUDIT] ❌ DENIED: ${user?.role || 'unknown'} tried to ${action} ${resource}`, reason);

  return log;
}

/**
 * Log an error
 */
export function logError(user, action, resource, error) {
  const log = {
    id: nextAuditId++,
    timestamp: new Date().toISOString(),
    user_id: user?.id,
    user_role: user?.role,
    user_email: user?.email,
    action,
    resource,
    status: 'error',
    error: error?.message || String(error),
  };

  auditLogs.push(log);
  console.log(`[AUDIT] ⚠️ ERROR: ${user?.role || 'unknown'} ${action} ${resource}`, error);

  return log;
}

/**
 * Get audit logs
 */
export function getAuditLogs(filters = {}) {
  let logs = [...auditLogs];

  if (filters.user_role) {
    logs = logs.filter(l => l.user_role === filters.user_role);
  }

  if (filters.resource) {
    logs = logs.filter(l => l.resource === filters.resource);
  }

  if (filters.status) {
    logs = logs.filter(l => l.status === filters.status);
  }

  if (filters.start_date) {
    logs = logs.filter(l => new Date(l.timestamp) >= new Date(filters.start_date));
  }

  if (filters.end_date) {
    logs = logs.filter(l => new Date(l.timestamp) <= new Date(filters.end_date));
  }

  // Return most recent first
  return logs.reverse();
}

/**
 * Clear audit logs (admin only)
 */
export function clearAuditLogs() {
  auditLogs.length = 0;
  console.log('[AUDIT] Logs cleared');
}

/**
 * Get audit log statistics
 */
export function getAuditStats() {
  const stats = {
    total_logs: auditLogs.length,
    by_role: {},
    by_resource: {},
    by_status: {},
    by_action: {},
  };

  auditLogs.forEach(log => {
    // By role
    stats.by_role[log.user_role] = (stats.by_role[log.user_role] || 0) + 1;

    // By resource
    stats.by_resource[log.resource] = (stats.by_resource[log.resource] || 0) + 1;

    // By status
    stats.by_status[log.status] = (stats.by_status[log.status] || 0) + 1;

    // By action
    stats.by_action[log.action] = (stats.by_action[log.action] || 0) + 1;
  });

  return stats;
}

export default {
  logAction,
  logDenial,
  logError,
  getAuditLogs,
  clearAuditLogs,
  getAuditStats,
};

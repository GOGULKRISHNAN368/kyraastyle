import AdminUser from '../models/AdminUser.js';
import { authCookieName, verifyAuthToken } from '../utils/auth.js';
import { env } from '../config/env.js';

export async function requireAuth(request, response, next) {
  if (process.env.AUTH_DISABLED === 'true') {
    const localAdmin = { id: 'local-dev', email: 'local-dev', role: 'admin' };
    request.admin = localAdmin;
    request.adminUser = { ...localAdmin, name: 'Local Admin', isActive: true };
    return next();
  }

  const cookieHeader = String(request.headers.cookie || '');
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${authCookieName}=`));
  let cookieToken = '';
  if (cookie) { try { cookieToken = decodeURIComponent(cookie.slice(authCookieName.length + 1)); } catch { cookieToken = ''; } }
  const token = request.cookies?.[authCookieName] || cookieToken;
  if (!token) return response.status(401).json({ message: 'Authentication required' });

  let payload;
  try {
    payload = verifyAuthToken(token);
  } catch {
    return response.status(401).json({ message: 'Authentication required' });
  }

  if (payload.dev === true && env.nodeEnv !== 'production' && payload.sub === 'development-owner') {
    request.adminUser = { id: 'development-owner', name: 'Local Admin', email: 'local-admin@localhost', role: 'owner', isActive: true };
    return next();
  }

  try {
    const user = await AdminUser.findById(payload.sub).select('name email role isActive');
    if (!user || !user.isActive) return response.status(401).json({ message: 'Authentication required' });
    request.adminUser = user;
    return next();
  } catch {
    return response.status(503).json({ message: 'Authentication service is temporarily unavailable.' });
  }
}

export function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.adminUser || !roles.includes(request.adminUser.role)) {
      return response.status(403).json({ message: 'Forbidden' });
    }
    return next();
  };
}

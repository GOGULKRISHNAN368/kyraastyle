import bcrypt from 'bcrypt';
import AdminUser from '../models/AdminUser.js';
import { clearAuthCookie, setAuthCookie, setDevelopmentAuthCookie } from '../utils/auth.js';
import { env } from '../config/env.js';

export async function login(request, response) {
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body?.password === 'string' ? request.body.password : '';
  const user = email && password
    ? await AdminUser.findOne({ email }).select('+passwordHash')
    : null;
  const validPassword = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !user.isActive || !validPassword) {
    return response.status(401).json({ message: 'Invalid email or password' });
  }

  user.lastLoginAt = new Date();
  await user.save();
  setAuthCookie(response, user.id);
  return response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}

export function logout(_request, response) {
  clearAuthCookie(response);
  return response.status(204).end();
}

export function developmentSession(_request, response) {
  if (env.nodeEnv === 'production') return response.sendStatus(404);
  setDevelopmentAuthCookie(response);
  return response.json({ user: { id: 'development-owner', name: 'Local Admin', email: 'local-admin@localhost', role: 'owner' } });
}

export function me(request, response) {
  const { id, name, email, role } = request.adminUser;
  return response.json({ user: { id, name, email, role } });
}

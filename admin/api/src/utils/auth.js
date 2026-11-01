import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const authCookieName = 'kryaastyle_admin_token';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: env.nodeEnv === 'production',
  path: '/',
};

export function setAuthCookie(response, userId) {
  if (!env.jwtSecret) throw new Error('JWT_SECRET is required');
  const token = jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  response.cookie(authCookieName, token, cookieOptions);
}

export function setDevelopmentAuthCookie(response) {
  if (!env.jwtSecret || env.nodeEnv === 'production') throw new Error('Development sessions are disabled');
  const token = jwt.sign({ sub: 'development-owner', dev: true }, env.jwtSecret, { expiresIn: '8h' });
  response.cookie(authCookieName, token, cookieOptions);
}

export function clearAuthCookie(response) {
  response.clearCookie(authCookieName, cookieOptions);
}

export function verifyAuthToken(token) {
  if (!env.jwtSecret) throw new Error('JWT_SECRET is required');
  return jwt.verify(token, env.jwtSecret);
}

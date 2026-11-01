import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { developmentSession, login, logout, me } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Try again later.' },
});

router.post('/login', loginLimiter, asyncHandler(login));
router.get('/dev-session', developmentSession);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);

export default router;

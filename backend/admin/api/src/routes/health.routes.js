import { Router } from 'express';
import { databaseStatus } from '../config/database.js';

const router = Router();

router.get('/health', (_request, response) => {
  response.json({ status: 'ok', db: databaseStatus() });
});

export default router;

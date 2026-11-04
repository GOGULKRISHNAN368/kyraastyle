import { Router } from 'express';
import * as customers from '../controllers/customers.controller.js';

const router = Router();
router.get('/', customers.list);

export default router;

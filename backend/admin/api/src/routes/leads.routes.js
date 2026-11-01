import { Router } from 'express';
import * as leads from '../controllers/leads.controller.js';

const router = Router();
router.get('/', leads.list);
router.post('/', leads.create);
router.patch('/:id/verified', leads.setVerified);

export default router;

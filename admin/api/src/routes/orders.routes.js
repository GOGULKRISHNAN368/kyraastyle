import { Router } from 'express';
import * as orders from '../controllers/orders.controller.js';

const router = Router();
router.get('/', orders.list);
router.post('/', orders.create);
router.put('/:id', orders.update);

export default router;

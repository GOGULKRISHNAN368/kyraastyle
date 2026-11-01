import { Router } from 'express';
import * as coupons from '../controllers/coupons.controller.js';

const router = Router();
router.get('/', coupons.list);
router.post('/', coupons.create);
router.put('/:id', coupons.update);
router.delete('/:id', coupons.remove);

export default router;

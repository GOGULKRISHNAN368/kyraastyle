import { Router } from 'express';
import * as orders from '../controllers/orders.controller.js';

const router = Router();
router.get('/', orders.list);
router.get('/:orderNumber', orders.get);
router.patch('/:orderNumber/status', orders.updateStatus);
router.patch('/:orderNumber/courier', orders.updateCourier);
router.patch('/:orderNumber/payment', orders.updatePayment);
router.patch('/:orderNumber/note', orders.updateNote);

export default router;

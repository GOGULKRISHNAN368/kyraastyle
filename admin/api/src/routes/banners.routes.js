import { Router } from 'express';
import * as banners from '../controllers/banners.controller.js';
const router = Router();
router.get('/', banners.list); router.post('/', banners.create); router.delete('/:id', banners.remove);
export default router;

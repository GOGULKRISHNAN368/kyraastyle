import { Router } from 'express';
import { productCategories } from '../controllers/settings.controller.js';

const router = Router();
router.get('/product-categories', productCategories);

export default router;

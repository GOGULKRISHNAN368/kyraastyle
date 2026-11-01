import { Router } from 'express';
import * as products from '../controllers/products.controller.js';

const router = Router();

router.get('/', products.list);
router.post('/', products.create);
router.post('/bulk', products.bulk);
router.patch('/reorder', products.reorder);
router.get('/image-preview', products.preview);
router.get('/:id', products.getOne);
router.put('/:id', products.update);
router.patch('/:id/active', products.updateActive);
router.delete('/:id', products.remove);

export default router;

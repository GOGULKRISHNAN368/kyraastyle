import { Router } from 'express';
import * as categories from '../controllers/categories.controller.js';

const router = Router();
router.get('/', categories.list);
router.post('/', categories.create);
router.put('/:key', categories.update);
router.delete('/:key', categories.remove);

export default router;

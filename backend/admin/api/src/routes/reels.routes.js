import { Router } from 'express';
import * as reels from '../controllers/reels.controller.js';

const router = Router();
router.get('/', reels.list);
router.post('/', reels.create);
router.delete('/:id', reels.remove);

export default router;

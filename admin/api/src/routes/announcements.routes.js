import { Router } from 'express';
import * as announcements from '../controllers/announcements.controller.js';

const router = Router();
router.get('/', announcements.list);
router.post('/', announcements.create);
router.delete('/:id', announcements.remove);

export default router;

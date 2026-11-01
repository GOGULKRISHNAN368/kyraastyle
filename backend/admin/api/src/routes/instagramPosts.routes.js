import { Router } from 'express';
import express from 'express';
import * as posts from '../controllers/instagramPosts.controller.js';

const router = Router();
router.get('/', posts.list);
router.post('/', express.raw({ type: 'application/octet-stream', limit: '100mb' }), posts.create);
router.get('/:id/image', posts.image);
router.delete('/:id', posts.remove);

export default router;

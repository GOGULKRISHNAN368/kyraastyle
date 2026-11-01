import { Router } from 'express';
import express from 'express';
import { uploadCategoryImageController, uploadDressImageController, uploadReelAssetController } from '../controllers/media.controller.js';

const router = Router();
router.post('/uploads', express.raw({ type: 'application/octet-stream', limit: '100mb' }), uploadDressImageController);
router.post('/category-uploads', express.raw({ type: 'application/octet-stream', limit: '100mb' }), uploadCategoryImageController);
router.post('/reel-uploads', (request, response, next) => {
  const limit = (request.get('X-Asset-Type') || '').startsWith('video/') ? '10mb' : '100mb';
  express.raw({ type: 'application/octet-stream', limit })(request, response, next);
}, uploadReelAssetController);

export default router;

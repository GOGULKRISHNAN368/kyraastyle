import cors from 'cors';
import express from 'express';
import healthRoutes from './routes/health.routes.js';
import productRoutes from './routes/products.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import mediaRoutes from './routes/media.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import couponsRoutes from './routes/coupons.routes.js';
import reelsRoutes from './routes/reels.routes.js';
import instagramPostsRoutes from './routes/instagramPosts.routes.js';
import leadsRoutes from './routes/leads.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import announcementsRoutes from './routes/announcements.routes.js';
import customersRoutes from './routes/customers.routes.js';
import bannersRoutes from './routes/banners.routes.js';
import authRoutes from './routes/auth.routes.js';
import { requireAuth } from './middleware/requireAuth.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();
// The admin dashboard is intentionally unauthenticated in this local-only API.
const authDisabled = true;
const adminUiOrigins = ['http://localhost:5174', 'http://127.0.0.1:5174'];

app.use(cors({ origin: adminUiOrigins, credentials: true, allowedHeaders: ['Content-Type', 'X-Image-Type', 'X-Asset-Type', 'X-File-Name'] }));
app.use(express.json());
app.use('/admin-api', healthRoutes);
const authMode = (_request, response) => response.json({ authDisabled });
app.get('/api/admin/auth-mode', authMode);
app.get('/admin-api/auth-mode', authMode);
app.use('/admin-api/auth', authRoutes);
app.use('/admin-api', requireAuth);
app.use('/api/admin', requireAuth);
app.use('/admin-api/products', productRoutes);
app.use('/admin-api/media', mediaRoutes);
app.use('/admin-api/categories', categoriesRoutes);
app.use('/admin-api/coupons', couponsRoutes);
app.use('/admin-api/reels', reelsRoutes);
app.use('/admin-api/instagram-posts', instagramPostsRoutes);
app.use('/admin-api/leads', leadsRoutes);
app.use('/admin-api/orders', ordersRoutes);
app.use('/api/admin/orders', ordersRoutes);
app.use('/admin-api/announcements', announcementsRoutes);
app.use('/admin-api/customers', customersRoutes);
app.use('/admin-api/banners', bannersRoutes);
app.use('/admin-api/settings', settingsRoutes);
app.use(errorHandler);

export default app;

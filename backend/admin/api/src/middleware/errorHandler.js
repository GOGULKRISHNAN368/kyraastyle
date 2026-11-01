import { ProductError } from '../services/products.service.js';
import { DressDetailsError } from '../services/dressDetails.service.js';
import { CloudinaryUploadError } from '../services/cloudinaryUpload.service.js';
import { CategoryError } from '../services/categories.service.js';
import { CouponError } from '../services/coupons.service.js';
import { ReelError } from '../services/reels.service.js';
import { CloudinaryVideoUploadError } from '../services/cloudinaryVideoUpload.service.js';
import { InstagramPostError } from '../services/instagramPosts.service.js';
import { LeadError } from '../services/leads.service.js';
import { OrderError } from '../services/orders.service.js';
import { AnnouncementError } from '../services/announcements.service.js';

export default function errorHandler(error, _request, response, _next) {
  if (response.headersSent) return;
  if (error?.code === 11000) {
    return response.status(409).json({ message: 'A product with this Cloudinary ID already exists.' });
  }
  if (error instanceof ProductError) return response.status(error.status).json({ message: error.message });
  if (error instanceof DressDetailsError) return response.status(error.status).json({ message: error.message });
  if (error instanceof CloudinaryUploadError) return response.status(error.status).json({ message: error.message });
  if (error instanceof CategoryError) return response.status(error.status).json({ message: error.message });
  if (error instanceof CouponError) return response.status(error.status).json({ message: error.message });
  if (error instanceof ReelError) return response.status(error.status).json({ message: error.message });
  if (error instanceof CloudinaryVideoUploadError) return response.status(error.status).json({ message: error.message });
  if (error instanceof InstagramPostError) return response.status(error.status).json({ message: error.message });
  if (error instanceof LeadError) return response.status(error.status).json({ message: error.message });
  if (error instanceof OrderError) return response.status(error.status).json({ message: error.message });
  if (error instanceof AnnouncementError) return response.status(error.status).json({ message: error.message });
  if (error?.code === 'ENOSPC') return response.status(507).json({ message: 'The admin server is out of disk space. Free up storage, then retry the image upload.' });
  if (error?.code === 'EACCES' || error?.code === 'EPERM') return response.status(500).json({ message: 'The admin server cannot save images in its upload folder. Check folder permissions.' });
  if (error?.type === 'entity.too.large') return response.status(413).json({ message: 'This upload is larger than the allowed size.' });
  if (error?.type === 'entity.parse.failed') return response.status(400).json({ message: 'Request body must be valid JSON.' });
  return response.status(500).json({ message: 'The admin request could not be completed.' });
}

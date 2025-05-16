import express from 'express';
import { getNotifications, markAsRead, markAllAsRead, createNotification } from '../controllers/notification.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', protectRoute, getNotifications);
router.post('/create', protectRoute, createNotification); // for testing/demo
router.post('/:id/mark-as-read', protectRoute, markAsRead);
router.post('/mark-all-as-read', protectRoute, markAllAsRead);
router.get('/notifications', protectRoute, getNotifications);

export default router; 
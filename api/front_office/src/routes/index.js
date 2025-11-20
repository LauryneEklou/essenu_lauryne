// ...existing code...
import express from 'express';
import dashboardController from '../controllers/dashboard.controller.js';

const router = express.Router();

// ...existing routes...
router.get('/dashboard/stats', dashboardController.getDashboardStats);

export default router;


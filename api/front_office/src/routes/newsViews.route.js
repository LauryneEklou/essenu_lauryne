import express from 'express';
import { recordView } from '../controllers/newsViews.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// POST /api/news_views - enregistre une vue (auth requis)
router.post('/', verifyToken, recordView);

export default router;


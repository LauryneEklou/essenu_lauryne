import express from 'express';
import { subscribe, unsubscribe, listSubscribers, countSubscribers } from '../controllers/newsletter.controller.js';

const router = express.Router();

router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);

// New: list and count
router.get('/subscribers', listSubscribers);
router.get('/subscribers/count', countSubscribers);

export default router;

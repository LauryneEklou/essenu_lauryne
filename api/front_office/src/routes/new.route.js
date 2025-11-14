// javascript
import express from 'express';
import { verifyToken } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import {
    getAllNews,
    getNewsById,
    getNewsByUser,
    createNews,
    updateNews,
    deleteNews
} from '../controllers/new.controller.js';
import { upload } from '../middlewares/upload.js';

const router = express.Router();

// Routes: make GET endpoints public so front-office can fetch news without authentication
router.get('/', getAllNews);
router.get('/:id', getNewsById);
// keep the user-specific route behind auth as it may be admin-only
router.get('/user/:userId', verifyToken, checkRole(['super_admin', 'admin_contenu']), getNewsByUser);

router.post(
    '/',
    verifyToken,
    checkRole(['super_admin', 'admin_contenu']),
    upload.single('image'),
    createNews
);

router.put(
    '/:id',
    verifyToken,
    checkRole(['super_admin', 'admin_contenu']),
    upload.single('image'),
    updateNews
);

router.delete('/:id', verifyToken, checkRole(['super_admin', 'admin_contenu']), deleteNews);

export default router;

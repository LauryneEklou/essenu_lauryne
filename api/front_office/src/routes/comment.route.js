import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';
import {
    listCommentsForNews,
    createComment,
    updateComment,
    deleteComment
} from '../controllers/comment.controller.js';
import { listAllCommentsForAdmin } from '../controllers/adminComment.controller.js';

const router = express.Router();

// public listing for a news
router.get('/', listCommentsForNews);

// admin listing under the comments namespace: /api/comments/all
router.get('/all', verifyToken, checkRole(['super_admin','admin_contenu']), listAllCommentsForAdmin);

// debug public listing (no auth) - DON'T expose in production
router.get('/public_all', listAllCommentsForAdmin);

// create/update/delete require authentication
router.post('/', verifyToken, createComment);
router.put('/:id', verifyToken, updateComment);
router.delete('/:id', verifyToken, deleteComment);

export default router;

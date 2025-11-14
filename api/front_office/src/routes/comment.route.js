import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import {
    listCommentsForNews,
    createComment,
    updateComment,
    deleteComment
} from '../controllers/comment.controller.js';

const router = express.Router();

// public listing for a news
router.get('/', listCommentsForNews);

// create/update/delete require authentication
router.post('/', verifyToken, createComment);
router.put('/:id', verifyToken, updateComment);
router.delete('/:id', verifyToken, deleteComment);

export default router;


import express from 'express';
import { listUsers, activateUser, deactivateUser, getUser } from '../controllers/user.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = express.Router();

// Public: list users by role (protected to admin types)
router.get('/', listUsers);
router.get('/:id', verifyToken, checkRole(['super_admin','admin_contenu','admin_accompagnement']), getUser);
router.post('/:id/activate', verifyToken, checkRole(['super_admin','admin_contenu','admin_accompagnement']), activateUser);
router.post('/:id/deactivate', verifyToken, checkRole(['super_admin','admin_contenu','admin_accompagnement']), deactivateUser);

export default router;

import express from 'express';
import {
    createAssistance,
    listAssistances,
    getAssistance,
    deleteAssistance
} from '../controllers/assistance.controller.js';

import { verifyToken } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = express.Router();

// Poster une demande d'accompagnement (public)
router.post('/', createAssistance);

// Lister les demandes - seulement admins d'accompagnement et super_admin
router.get('/', verifyToken, checkRole(['super_admin', 'admin_accompagnement']), listAssistances);

// Récupérer une demande par id
router.get('/:id', verifyToken, checkRole(['super_admin', 'admin_accompagnement']), getAssistance);

// Supprimer une demande
router.delete('/:id', verifyToken, checkRole(['super_admin', 'admin_accompagnement']), deleteAssistance);

export default router;


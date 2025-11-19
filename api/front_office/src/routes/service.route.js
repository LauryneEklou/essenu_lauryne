import express from 'express';
import {
    getServices,
    getService,
    createService,
    updateService,
    deleteService
} from '../controllers/service.controller.js';

import { verifyToken } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = express.Router();

// Lister tous les services (public)
router.get('/', getServices);

// Récupérer un service par id (auth requis)
router.get('/:id', verifyToken, getService);

// Créer un service - seulement super_admin et admin_contenu
router.post('/', verifyToken, checkRole(['super_admin', 'admin_accompagnement']), createService);

// Mettre à jour un service
router.put('/:id', verifyToken, checkRole(['super_admin', 'admin_accompagnement']), updateService);

// Supprimer un service
router.delete('/:id', verifyToken, checkRole(['super_admin', 'admin_accompagnement']), deleteService);

export default router;


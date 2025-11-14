import express from 'express';
import {
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory
} from '../controllers/category.controller.js';

import { verifyToken} from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = express.Router();

// Récupérer toutes les catégories - accessible à tous les admins
router.get('/', getCategories);

// Récupérer une catégorie par id
router.get('/:id', verifyToken, getCategory);

// Créer une catégorie - seulement super_admin et admin_contenu
router.post('/', verifyToken, checkRole(['super_admin', 'admin_contenu']), createCategory);

// Mettre à jour une catégorie
router.put('/:id', verifyToken, checkRole(['super_admin', 'admin_contenu']), updateCategory);

// Supprimer une catégorie
router.delete('/:id', verifyToken, checkRole(['super_admin', 'admin_contenu']), deleteCategory);

export default router;

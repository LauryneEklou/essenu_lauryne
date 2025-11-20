import express from 'express';
import { verifyToken } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import {
    createDocument,
    getAllDocuments,
    getDocumentById,
    updateDocument,
    deleteDocument,
    downloadDocument,
    getCategoriesStats,
    getTopDownloads,
    streamDocuments
} from '../controllers/document.controller.js';

import { upload } from '../middlewares/upload.js';

const router = express.Router();

// Création document avec upload de fichier + image
router.post('/',verifyToken,checkRole(['super_admin', 'admin_contenu']),upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 10 }
]), createDocument);

router.get('/', getAllDocuments);

// statistics endpoints (declare before param routes to avoid conflicts)
router.get('/stats/categories', getCategoriesStats);
router.get('/stats/top_downloads', getTopDownloads);

// SSE stream for real-time updates
router.get('/stream', streamDocuments);

// download route must be declared before router.get('/:id') to avoid param conflicts
router.get('/:id/download', downloadDocument);

router.get('/:id', verifyToken, getDocumentById);
router.put('/:id', verifyToken, upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 10 }
]),updateDocument);

router.delete('/:id', verifyToken, deleteDocument);

export default router;

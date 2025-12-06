import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { listReponses, createReponse, getAttachment } from '../controllers/reponse.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = express.Router({ mergeParams: true });

// helper middlewares to optionally skip auth/role checks during tests
function authOrSkip(req, res, next){
    if(process.env.SKIP_AUTH === 'true') return next();
    return verifyToken(req, res, next);
}
function roleOrSkip(roles){
    return function(req, res, next){
        if(process.env.SKIP_AUTH === 'true') return next();
        return checkRole(roles)(req, res, next);
    };
}

// Multer storage config for local uploads (pieces_jointes)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dest = path.join(process.cwd(), 'uploads', 'pieces_jointes');
        cb(null, dest);
    },
    filename: function (req, file, cb) {
        // keep original filename but sanitize it and ensure uniqueness
        const original = path.basename(file.originalname);
        // sanitize: remove path separators and unprintable chars
        const safe = original.replace(/[^a-zA-Z0-9._\-\s]/g, '_').trim();
        const dest = path.join(process.cwd(), 'uploads', 'pieces_jointes');
        let filename = safe;
        try{
            // if exists, append timestamp
            if(fs.existsSync(path.join(dest, filename))){
                const stamp = Date.now();
                const ext = path.extname(safe);
                const base = path.basename(safe, ext);
                filename = `${base}-${stamp}${ext}`;
            }
        }catch(e){
            // fallback to timestamped name
            const ext = path.extname(safe);
            const base = path.basename(safe, ext);
            filename = `${base}-${Date.now()}${ext}`;
        }
        cb(null, filename);
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

// List replies for an assistance request
router.get('/', authOrSkip, listReponses);

// Create reply (admin or owner) with optional attachments
router.post('/', authOrSkip, upload.array('attachments', 5), createReponse);

// Get attachment (stream)
router.get('/attachments/:attId', authOrSkip, getAttachment);

// Mark a response as read (PATCH) - admin or owner
router.patch('/:reponseId/read', authOrSkip, roleOrSkip(['super_admin','admin_accompagnement']), (req, res, next) => {
    // delegate to controller via dynamic import to avoid cycles
    import('../controllers/reponse.controller.js').then(m => m.markAsRead(req, res)).catch(next);
});

export default router;

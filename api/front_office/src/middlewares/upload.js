import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Crée les dossiers si inexistants
const makeDir = (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

makeDir('./uploads/documents');
makeDir('./uploads/images');

// Configuration du stockage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'file') cb(null, './uploads/documents');
        else if (file.fieldname === 'image') cb(null, './uploads/images');
        else cb(new Error('Type de fichier non supporté'), false);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueName + path.extname(file.originalname));
    },
});

export const upload = multer({ storage });

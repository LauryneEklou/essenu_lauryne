import dotenv from 'dotenv';
import express from 'express';
import connection from './config/db.js';       // connexion MySQL
import authRoutes from './routes/auth.route.js';
import adminRoutes from './routes/admin.route.js';
import categoryRoutes from './routes/category.route.js';
import documentRoutes from './routes/document.route.js';
import newRoutes from './routes/new.route.js';
import commentRoutes from './routes/comment.route.js';
import serviceRoutes from './routes/service.route.js';
import assistanceRoutes from './routes/assistance.route.js';
import reponseRoutes from './routes/reponse.route.js';
import userRoutes from './routes/user.route.js';
import cors from 'cors'; // <- on ajoute cors ici
import * as dashboardController from './controllers/dashboard.controller.js';
import newsletterRoute from './routes/newsletter.route.js';
import newsViewsRoute from './routes/newsViews.route.js';
import fs from 'fs';
import path from 'path';


// routes auth

dotenv.config();

const app = express();

// set a friendly CSP for development so inline styles and local assets are allowed
app.use((req, res, next) => {
    // allow styles/scripts from self and localhost dev ports and permit inline styles for now
    res.setHeader('Content-Security-Policy', "default-src 'self' http://localhost:3000 http://localhost:4000 http://localhost:5000; script-src 'self' 'unsafe-inline' http://localhost:3000 http://localhost:4000 http://localhost:5000; style-src 'self' 'unsafe-inline' http://localhost:3000 http://localhost:4000 http://localhost:5000; connect-src 'self' http://localhost:3000 http://localhost:4000 http://localhost:5000; img-src 'self' data:;");
    next();
});

// Helper: allowed origins
const allowedOrigins = [process.env.FRONT_URL, 'http://localhost:3000', 'http://localhost:4000'].filter(Boolean);

const corsOptions = {
    origin: function(origin, callback) {
        // allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        // allow configured origins
        if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);

        // allow any http(s)://localhost:PORT origin
        if (/^https?:\/\/localhost(?::\d+)?$/.test(origin)) return callback(null, true);

        // otherwise block
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    // ajouter PATCH pour permettre les mises à jour via fetch(..., { method: 'PATCH' })
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization']
};

// In development, relax CORS to ease debugging (allow all origins). Remove/adjust in production.
if (process.env.NODE_ENV !== 'production') {
    corsOptions.origin = true; // allow any origin
}

// Middleware pour lire le JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors(corsOptions));

// Servir les fichiers uploadés
app.use('/uploads/images', express.static('uploads/images'));
app.use('/uploads/files', express.static('uploads/files'));

// Ensure pieces_jointes upload directory exists and serve it
const piecesUploadDir = path.join(process.cwd(), 'uploads', 'pieces_jointes');
try{
    if(!fs.existsSync(piecesUploadDir)){
        fs.mkdirSync(piecesUploadDir, { recursive: true });
        console.log('[server] Created upload directory', piecesUploadDir);
    }
}catch(e){ console.error('[server] Failed to create pieces_jointes upload dir', e); }
app.use('/uploads/pieces_jointes', express.static(piecesUploadDir));

// Route test racine
app.get('/', (req, res) => {
    res.send('Bienvenue sur l’API de la plateforme juridique ⚖️');
});

// Quick test endpoint
app.get('/api/users_test', (req, res) => {
    res.json({ ok: true, msg: 'users_test endpoint reachable' });
});

// Routes d'authentification
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
// Alias pour compatibilité ascendante
app.use('/api/admins', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/news',newRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/services', serviceRoutes);

// Ensure OPTIONS preflight for assistances endpoints are handled
app.options('/api/assistances', cors(corsOptions));
app.options('/api/assistances/:id', cors(corsOptions));

app.use('/api/assistances', assistanceRoutes);
// mount replies router under assistances (mergeParams in router)
app.use('/api/assistances/:assistId/reponses', reponseRoutes);
// news views (enregistrement des vues d'articles)
app.use('/api/news_views', newsViewsRoute);
// users endpoints
app.use('/api/users', userRoutes);

// Newsletter subscription route
app.use('/api/newsletter', newsletterRoute);

// Dashboard stats endpoint
app.get('/api/dashboard/stats', dashboardController.getDashboardStats);
app.get('/api/dashboard/top_authors', dashboardController.getTopAuthors);
app.get('/api/dashboard/top_news_comments', dashboardController.getTopNewsByComments);
app.get('/api/dashboard/top_news_views', dashboardController.getTopNewsByViews);

// Serves debug endpoint to inspect DB schema in development
if (process.env.NODE_ENV !== 'production') {
    app.get('/debug/schema/users', (req, res) => {
        connection.query('SHOW CREATE TABLE users', (err, results) => {
            if (err) {
                console.error('[DEBUG] SHOW CREATE TABLE users error:', err);
                return res.status(500).json({ message: 'Erreur SHOW CREATE TABLE users', error: err && (err.sqlMessage || err.message) });
            }
            // return the full results (array with Create Table text)
            return res.status(200).json({ result: results });
        });
    });
}

// Lancement du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});

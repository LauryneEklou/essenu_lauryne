import jwt from 'jsonwebtoken';
import env from '../../../../content_manager_client/config.js';
import { findUserById } from '../models/user.model.js';


// Vérifie le token JWT pour les routes API
export function verifyToken(req, res, next) {
    try {
        // accept token from Authorization header (Bearer) or cookie 'auth_token' or cookie 'token'
        const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization);
        let token = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.cookies && (req.cookies.auth_token || req.cookies.token)) {
            token = req.cookies.auth_token || req.cookies.token;
        } else if (req.headers && req.headers.cookie) {
            // fallback: parse Cookie header manually if cookie-parser not available / not used
            try {
                const cookieHeader = req.headers.cookie || '';
                const cookies = cookieHeader.split(';').map(c => c.trim()).filter(Boolean).reduce((acc, kv) => {
                    const i = kv.indexOf('='); if (i === -1) return acc; acc[kv.substring(0,i).trim()] = decodeURIComponent(kv.substring(i+1)); return acc;
                }, {});
                if (cookies.auth_token) token = cookies.auth_token;
                else if (cookies.token) token = cookies.token;
            } catch (e) {
                // ignore parse errors
            }
        }

        if (!token) {
            // If request expects JSON, return JSON error, otherwise redirect to auth page
            const acceptsJSON = req.headers && req.headers.accept && req.headers.accept.includes('application/json');
            console.warn('[verifyToken] token missing for request', { path: req.originalUrl, headers: { accept: req.headers.accept } });
            if (acceptsJSON) return res.status(401).json({ message: 'Veuillez vous connecter pour accéder à cette fonctionnalité' });
            return res.redirect(`/${req.lang || env.default_language}/auth`);
        }

        const secret = process.env.JWT_SECRET || env.JWT_SECRET;
        if (!secret) return res.status(500).json({ message: 'JWT secret not configured' });

        const decoded = jwt.verify(token, secret);
        // Charger l'utilisateur depuis la DB afin d'avoir le flag must_change_password à jour
        findUserById(decoded.id, (err, results) => {
            if (err) {
                console.error('[verifyToken] findUserById error', err);
                const acceptsJSON = req.headers && req.headers.accept && req.headers.accept.includes('application/json');
                if (acceptsJSON) return res.status(500).json({ message: 'Erreur serveur' });
                return res.redirect(`/${req.lang || env.default_language}/auth`);
            }
            if (!results || results.length === 0) {
                const acceptsJSON = req.headers && req.headers.accept && req.headers.accept.includes('application/json');
                if (acceptsJSON) return res.status(404).json({ message: 'Utilisateur introuvable' });
                return res.redirect(`/${req.lang || env.default_language}/auth`);
            }
            const user = results[0];
            // Si l'utilisateur doit changer son mot de passe, bloquer l'accès à toutes les routes sauf /api/auth/change-password
            const path = req.originalUrl || req.url || '';
            if (user.must_change_password) {
                // autoriser la route de changement de mot de passe
                if (path.startsWith('/api/auth/change-password') || path.startsWith('/api/auth/login') || path.startsWith('/api/auth/logout') || path.startsWith('/api/auth/me')) {
                    // Allow login/me/logout/change-password endpoints
                } else {
                    const acceptsJSON = req.headers && req.headers.accept && req.headers.accept.includes('application/json');
                    if (acceptsJSON) return res.status(403).json({ message: 'Veuillez changer votre mot de passe avant d\'accéder à l\'application' });
                    return res.redirect(`/${req.lang || env.default_language}/auth`);
                }
            }

            // Attacher les informations décodées et complètes
            req.user = Object.assign({}, decoded, { db: user });
            next();
        });
    } catch (err) {
        console.error('Auth verify failed:', err && err.message);
        const acceptsJSON = req.headers && req.headers.accept && req.headers.accept.includes('application/json');
        if (acceptsJSON) return res.status(403).json({ message: 'Jeton invalide ou expiré, veuillez vous reconnecter' });
        return res.redirect(`/${req.lang || env.default_language}/auth`);
    }
}

// Redirect-style role check (kept for server-side rendered flows)
export function checkRole(requiredRole) {
    return (req, res, next) => {
        try {
            const role = req.user && req.user.role;
            if (!role) return res.redirect(`/${req.lang || env.default_language}/auth`);
            if (role !== requiredRole) return res.redirect(`/${req.lang || env.default_language}/dashboard`);
            next();
        } catch (e) {
            return res.redirect(`/${req.lang || env.default_language}/auth`);
        }
    };
}

// default export for code that was using CommonJS-style import
export default { verifyToken, checkRole };

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { createUser, findUserByEmail, findUserById } from "../models/user.model.js";

export const register = (req, res) => {
    const { first_name, last_name, email, password, role: provided_role } = req.body;

    // default role for public front-office signups
    let role = 'visiteur';

    // If a token is present and belongs to an admin user, accept provided_role
    const token = (req.cookies && req.cookies.token) || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (token) {
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            const adminRoles = ['super_admin', 'admin_contenu', 'admin_accompagnement'];
            if (payload && payload.role && adminRoles.includes(payload.role) && provided_role) {
                // only accept provided roles that are in the allowed enum
                const allowedRoles = ['super_admin','admin_contenu','admin_accompagnement','visiteur'];
                if (allowedRoles.includes(provided_role)) role = provided_role;
            }
        } catch (e) {
            // token invalid or not present — ignore and keep default 'visiteur'
            console.debug('[auth.register] token verify failed, using default role=visiteur');
        }
    }

    if (!email || !password)
        return res.status(400).json({ message: "Champs obligatoires manquants" });

    console.debug('[auth.register] payload:', { first_name, last_name, email, role, provided_role });

    findUserByEmail(email, (err, results) => {
        if (err) {
            console.error('[auth.register] findUserByEmail error:', err);
            return res.status(500).json({ message: 'Erreur serveur' });
        }

        if (results && results.length > 0) {
            console.debug('[auth.register] email already exists:', email);
            return res.status(400).json({ message: "Email déjà utilisé" });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        createUser({ first_name, last_name, email, password: hashedPassword, role }, (err, createResult) => {
            if (err) {
                console.error('[auth.register] createUser error:', err);
                return res.status(500).json({ message: "Erreur serveur" });
            }
            console.debug('[auth.register] createUser result:', createResult);
            // generic message for created user
            res.status(201).json({ message: "Utilisateur créé avec succès", role });
        });
    });
};

export const login = (req, res) => {
    const { email, password } = req.body;

    findUserByEmail(email, (err, results) => {
        if (err) return res.status(500).json({ message: "Erreur serveur" });
        if (results.length === 0) return res.status(400).json({ message: "Email ou mot de passe incorrecte" });

        const user = results[0];

        // Vérification du statut
        if (user.status !== 'active') {
            return res.status(403).json({ message: "Compte désactivé" });
        }

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) return res.status(400).json({ message: "Mot de passe incorrect" });

        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "20h" }
        );
        try {
            res.cookie('token', token, {
                httpOnly: true,
                secure: false,
                maxAge: 20 * 3600 * 1000, // 20 hours
                sameSite: 'lax'
            });
        } catch (e) {
            console.warn('Could not set cookie:', e && e.message);
        }
        res.json({
            message: "Connexion réussie",
            id: user.id,
            token,
            role: user.role,
            first_name: user.first_name
        });
    });
};

export const me = (req, res) => {
    // try cookie then authorization header
    const token = (req.cookies && req.cookies.token) || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) return res.status(401).json({ message: 'Non authentifié' });

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        // payload contains id, role, email
        // load user from DB to ensure fresh data
        findUserById(payload.id, (err, results) => {
            if (err) return res.status(500).json({ message: 'Erreur serveur' });
            if (!results || results.length === 0) return res.status(404).json({ message: 'Utilisateur introuvable' });
            const user = results[0];
            return res.json({ id: user.id, first_name: user.first_name, role: user.role, email: user.email });
        });
    } catch (err) {
        return res.status(401).json({ message: 'Token invalide' });
    }
};

// Logout: clear authentication cookies (token/auth_token) and return success
export const logout = (req, res) => {
    try {
        // clear common cookie names used by the app
        res.clearCookie('token', { httpOnly: true, secure: false, sameSite: 'lax' });
        res.clearCookie('auth_token', { httpOnly: true, secure: false, sameSite: 'lax' });
        // also clear a possible 'user' cookie if set client-side
        res.clearCookie('user', { httpOnly: false, secure: false, sameSite: 'lax' });
    } catch (e) {
        console.warn('[auth.logout] clearCookie failed', e && e.message);
    }
    return res.json({ message: 'Déconnecté' });
};

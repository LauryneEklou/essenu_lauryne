import bcrypt from "bcryptjs";
import { getAllAdmins, createAdmin, toggleAdminStatus, deleteAdmin as modelDeleteAdmin } from "../models/user.model.js";

export const listAdmins = (req, res) => {
    getAllAdmins((err, results) => {
        if (err) {
            console.error('[listAdmins] DB error:', err && err.message, err && err.sqlMessage ? (' SQL: '+err.sqlMessage) : '');
            const isDev = process.env.NODE_ENV !== 'production';
            return res.status(500).json({ message: 'Erreur serveur', ...(isDev ? { error: err && err.message } : {}) });
        }
        res.status(200).json(results);
    });
};

export const addAdmin = (req, res) => {
    console.debug('[addAdmin] raw req.body type:', typeof req.body, 'value:', req.body);

    // normalize payload: accept object, stringified JSON, or nested { data: '...json...' }
    let payload = req.body;
    if (!payload) payload = {};
    if (typeof payload === 'string'){
        try{ payload = JSON.parse(payload); }catch(e){ console.debug('[addAdmin] failed to parse string body'); }
    }
    // if some clients send { data: '{...}' }
    if (payload && typeof payload.data === 'string'){
        try{ const parsed = JSON.parse(payload.data); if (parsed && typeof parsed === 'object') payload = parsed; }catch(e){ /* ignore */ }
    }

    // Accept multiple key variants coming from different clients/builds
    const first_name = payload.first_name || payload.firstname || payload.firstName || payload.first || null;
    const last_name = payload.last_name || payload.lastname || payload.lastName || payload.last || null;
    const email = payload.email || null;
    const password = payload.password || null;
    const role = payload.role || null;

    console.debug('[addAdmin] normalized payload:', payload, 'extracted:', { first_name, last_name, email, role, hasPassword: !!password });

    if (!first_name || !last_name || !email || !password || !role)
        return res.status(400).json({ message: 'Tous les champs sont obligatoires' });

    const hashedPassword = bcrypt.hashSync(password, 10);

    createAdmin({ first_name, last_name, email, password: hashedPassword, role, must_change_password: 1 }, (err) => {
        if (err) {
            console.error('[addAdmin] DB error full:', err);
            // If duplicate email detected, return 409 Conflict
            if (err.code === 'ER_DUP_ENTRY' || err.message && err.message.toLowerCase().includes('duplicate')) {
                return res.status(409).json({ message: 'Un compte avec cet email existe déjà' });
            }
            const isDev = process.env.NODE_ENV !== 'production';
            return res.status(500).json({ message: 'Erreur lors de la création', ...(isDev ? { error: err && (err.sqlMessage || err.message) } : {}) });
        }
        res.status(201).json({ message: 'Administrateur ajouté avec succès' });
    });
};

export const updateAdminStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'active' ou 'inactive'

    toggleAdminStatus(id, status, (err) => {
        if (err) {
            console.error('[updateAdminStatus] DB error:', err && err.message, err && err.sqlMessage ? (' SQL: '+err.sqlMessage) : '');
            const isDev = process.env.NODE_ENV !== 'production';
            return res.status(500).json({ message: 'Erreur lors de la mise à jour du statut', ...(isDev ? { error: err && err.message } : {}) });
        }
        res.status(200).json({ message: `Compte ${status === 'active' ? 'activé' : 'désactivé'} avec succès` });
    });
};

export const deleteAdmin = (req, res) => {
    const { id } = req.params;
    if(!id) return res.status(400).json({ message: 'ID requis' });
    modelDeleteAdmin(id, (err) => {
        if(err){
            console.error('[deleteAdmin] DB error:', err && err.message, err && err.sqlMessage ? (' SQL: '+err.sqlMessage) : '');
            const isDev = process.env.NODE_ENV !== 'production';
            return res.status(500).json({ message: 'Erreur suppression administrateur', ...(isDev?{error: err && err.message}: {}) });
        }
        res.status(200).json({ message: 'Administrateur supprimé' });
    });
};

export const updateAdmin = (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, email, role, password } = req.body;
    if (!id) return res.status(400).json({ message: 'ID requis' });
    // validation minimale
    if (!first_name || !last_name || !email || !role) return res.status(400).json({ message: 'Champs manquants' });

    let updatePayload = { first_name, last_name, email, role };
    if (password) {
        const hashed = bcrypt.hashSync(password, 10);
        updatePayload.password = hashed;
        // When a super-admin sets the password for another admin, force them to change it on first login
        updatePayload.must_change_password = 1;
    }

    // appeler modèle
    try{
        import('../models/user.model.js').then(mod => {
            const { updateAdmin: modelUpdateAdmin } = mod;
            modelUpdateAdmin(id, updatePayload, (err) => {
                if (err) {
                    console.error('[updateAdmin] DB error:', err && err.message, err && err.sqlMessage ? (' SQL: '+err.sqlMessage) : '');
                    const isDev = process.env.NODE_ENV !== 'production';
                    return res.status(500).json({ message: 'Erreur mise à jour administrateur', ...(isDev?{error: err && err.message}: {}) });
                }
                res.status(200).json({ message: 'Administrateur mis à jour' });
            });
        }).catch(e=>{
            console.error('Import model failed', e);
            res.status(500).json({ message: 'Erreur serveur' });
        });
    }catch(e){
        console.error('updateAdmin error', e);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

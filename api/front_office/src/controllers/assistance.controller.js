import { Assistance } from '../models/assistance.model.js';

export const createAssistance = (req, res) => {
    const payload = req.body || {};
    const data = {
        user_id: payload.user_id || (req.user && req.user.id) || null,
        nom: payload.nom || null,
        prenom: payload.prenom || null,
        email: payload.email || null,
        telephone: payload.telephone || null,
        service_id: payload.service_id || null,
        service: payload.service || null,
        domaine: payload.domaine || null,
        message: payload.message || null,
        urgent: payload.urgent === true || payload.urgent === '1' || payload.urgent === 1 || payload.urgent === 'true'
    };

    if (!data.email || !data.message || !data.service) return res.status(400).json({ message: 'Champs obligatoires manquants' });

    Assistance.create(data, (err, results) => {
        if (err) {
            console.error('[createAssistance] DB error:', err);
            return res.status(500).json({ message: 'Erreur serveur' });
        }
        res.status(201).json({ message: 'Demande enregistrée', requestId: results.insertId });
    });
};

export const listAssistances = (req, res) => {
    Assistance.findAll((err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur', error: err });
        res.json(results);
    });
};

// NEW: lister les demandes pour l'utilisateur courant (exige verifyToken middleware)
export const listByUser = (req, res) => {
    try{
        const userId = req.user && req.user.id;
        if(!userId) return res.status(401).json({ message: 'Utilisateur non authentifié' });
        Assistance.findByUser(userId, (err, results) => {
            if(err) return res.status(500).json({ message: 'Erreur serveur', error: err });
            return res.json(Array.isArray(results) ? results : []);
        });
    }catch(e){
        return res.status(500).json({ message: 'Erreur serveur', error: e && e.message });
    }
};

export const getAssistance = (req, res) => {
    const id = req.params.id;
    Assistance.findById(id, (err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur', error: err });
        if (!results || results.length === 0) return res.status(404).json({ message: 'Demande introuvable' });
        res.json(results[0]);
    });
};

export const deleteAssistance = (req, res) => {
    const id = req.params.id;
    Assistance.delete(id, (err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur', error: err });
        res.json({ message: 'Demande supprimée' });
    });
};

export const updateAssistance = (req, res) => {
    const id = req.params.id;
    const statut = req.body && req.body.statut ? String(req.body.statut) : null;
    console.debug('[updateAssistance] id=', id, 'body=', req.body);
    const allowed = new Set(['en_attente','acceptee','en_traitement','terminee','refusee']);
    if(!statut || !allowed.has(statut)) return res.status(400).json({ message: 'Statut invalide' });

    Assistance.updateStatus(id, statut, (err, results) => {
        if(err) return res.status(500).json({ message: 'Erreur serveur', error: err });
        return res.json({ message: 'Statut mis à jour', statut });
    });
};

export default {
    createAssistance,
    listAssistances,
    getAssistance,
    deleteAssistance,
    updateAssistance,
    listByUser
};

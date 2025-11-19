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

export default {
    createAssistance,
    listAssistances,
    getAssistance,
    deleteAssistance
};


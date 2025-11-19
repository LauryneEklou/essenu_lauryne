import { Service } from '../models/service.model.js';

// Lister tous les services
export const getServices = (req, res) => {
    Service.findAll((err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur', error: err });
        res.json(results);
    });
};

// Récupérer un service par id
export const getService = (req, res) => {
    const id = req.params.id;
    Service.findById(id, (err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur', error: err });
        if (!results || results.length === 0) return res.status(404).json({ message: 'Service non trouvé' });
        res.json(results[0]);
    });
};

// Créer un service
export const createService = (req, res) => {
    const { name, description } = req.body;
    const created_by = req.user && req.user.id ? req.user.id : null;
    if (!name) return res.status(400).json({ message: 'Le nom du service est requis' });

    Service.create({ name, description, created_by }, (err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur', error: err });
        res.status(201).json({ message: 'Service créé', serviceId: results.insertId });
    });
};

// Mettre à jour un service
export const updateService = (req, res) => {
    const id = req.params.id;
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Le nom du service est requis' });

    Service.update(id, { name, description }, (err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur', error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Service non trouvé' });
        res.json({ message: 'Service mis à jour' });
    });
};

// Supprimer un service
export const deleteService = (req, res) => {
    const id = req.params.id;
    Service.delete(id, (err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur', error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Service non trouvé' });
        res.json({ message: 'Service supprimé' });
    });
};

export default {
    getServices,
    getService,
    createService,
    updateService,
    deleteService
};


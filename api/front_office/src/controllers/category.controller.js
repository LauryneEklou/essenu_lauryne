import { Category } from '../models/category.model.js';

// Lister toutes les catégories
export const getCategories = (req, res) => {
    Category.findAll((err, results) => {
        if (err) return res.status(500).json({ message: "Erreur serveur", error: err });
        res.json(results);
    });
};

// Récupérer une catégorie par id
export const getCategory = (req, res) => {
    const id = req.params.id;
    Category.findById(id, (err, results) => {
        if (err) return res.status(500).json({ message: "Erreur serveur", error: err });
        if (!results || results.length === 0) return res.status(404).json({ message: "Catégorie non trouvée" });
        res.json(results[0]);
    });
};

// Créer une catégorie
export const createCategory = (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Nom et type requis" });

    Category.create({ name }, (err, results) => {
        if (err) return res.status(500).json({ message: "Erreur serveur", error: err });
        res.status(201).json({ message: "Catégorie créée", categoryId: results.insertId });
    });
};

// Mettre à jour une catégorie
export const updateCategory = (req, res) => {
    const id = req.params.id;
    const { name } = req.body;

    Category.update(id, { name }, (err, results) => {
        if (err) return res.status(500).json({ message: "Erreur serveur", error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: "Catégorie non trouvée" });
        res.json({ message: "Catégorie mise à jour" });
    });
};

// Supprimer une catégorie
export const deleteCategory = (req, res) => {
    const id = req.params.id;

    Category.delete(id, (err, results) => {
        if (err) return res.status(500).json({ message: "Erreur serveur", error: err });
        if (results.affectedRows === 0) return res.status(404).json({ message: "Catégorie non trouvée" });
        res.json({ message: "Catégorie supprimée" });
    });
};

import connection from '../config/db.js';

export const Category = {

    // Lister toutes les catégories
    findAll: (callback) => {
        const sql = "SELECT * FROM categories";
        connection.query(sql, callback);
    },

    // Trouver une catégorie par ID
    findById: (id, callback) => {
        const sql = "SELECT * FROM categories WHERE id = ?";
        connection.query(sql, [id], callback);
    },

    // Créer une catégorie
    create: ({name}, callback) => {
        const sql = "INSERT INTO categories (name) VALUES (?)";
        connection.query(sql, [name], callback);
    },

    // Mettre à jour une catégorie
    update: (id, { name }, callback) => {
        const sql = "UPDATE categories SET name = ? WHERE id = ?";
        connection.query(sql, [name,id], callback);
    },

    // Supprimer une catégorie
    delete: (id, callback) => {
        const sql = "DELETE FROM categories WHERE id = ?";
        connection.query(sql, [id], callback);
    }
};
export default Category;
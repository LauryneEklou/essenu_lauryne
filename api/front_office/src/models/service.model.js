import connection from '../config/db.js';

export const Service = {

    // Lister tous les services
    findAll: (callback) => {
        const sql = "SELECT * FROM services ORDER BY name ASC";
        connection.query(sql, callback);
    },

    // Trouver un service par ID
    findById: (id, callback) => {
        const sql = "SELECT * FROM services WHERE id = ?";
        connection.query(sql, [id], callback);
    },

    // Créer un service
    create: ({ name, description, created_by }, callback) => {
        const sql = "INSERT INTO services (name, description, created_by) VALUES (?, ?, ?)";
        connection.query(sql, [name, description || null, created_by || null], callback);
    },

    // Mettre à jour un service
    update: (id, { name, description }, callback) => {
        const sql = "UPDATE services SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        connection.query(sql, [name, description || null, id], callback);
    },

    // Supprimer un service
    delete: (id, callback) => {
        const sql = "DELETE FROM services WHERE id = ?";
        connection.query(sql, [id], callback);
    }
};

export default Service;


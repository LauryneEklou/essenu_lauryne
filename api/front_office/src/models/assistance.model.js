import connection from '../config/db.js';

export const Assistance = {
    create: (data, callback) => {
        const sql = `INSERT INTO assistance_requests (user_id, nom, prenom, email, telephone, service_id, service, domaine, message, urgent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [
            data.user_id || null,
            data.nom || null,
            data.prenom || null,
            data.email,
            data.telephone || null,
            data.service_id || null,
            data.service || null,
            data.domaine || null,
            data.message || null,
            data.urgent ? 1 : 0
        ];
        connection.query(sql, params, callback);
    },

    findAll: (callback) => {
        const sql = `SELECT ar.*, s.name as service_name, u.first_name as user_first_name, u.last_name as user_last_name FROM assistance_requests ar LEFT JOIN services s ON ar.service_id = s.id LEFT JOIN users u ON ar.user_id = u.id ORDER BY ar.created_at DESC`;
        connection.query(sql, callback);
    },

    findById: (id, callback) => {
        const sql = `SELECT * FROM assistance_requests WHERE id = ?`;
        connection.query(sql, [id], callback);
    },

    update: (id, data, callback) => {
        const sql = `UPDATE assistance_requests SET ? WHERE id = ?`;
        connection.query(sql, [data, id], callback);
    },

    updateStatus: (id, statut, callback) => {
        const sql = `UPDATE assistance_requests SET statut = ?, updated_at = NOW() WHERE id = ?`;
        connection.query(sql, [statut, id], callback);
    },

    delete: (id, callback) => {
        const sql = `DELETE FROM assistance_requests WHERE id = ?`;
        connection.query(sql, [id], callback);
    },

    findByUser: (userId, callback) => {
        const sql = `SELECT ar.*, s.name as service_name FROM assistance_requests ar LEFT JOIN services s ON ar.service_id = s.id WHERE ar.user_id = ? ORDER BY ar.created_at DESC`;
        connection.query(sql, [userId], callback);
    }
};

export default Assistance;

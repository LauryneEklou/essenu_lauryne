import connection from '../config/db.js';

export const Reponse = {
    create: (data, callback) => {
        const sql = `INSERT INTO reponses_assistance (assistance_request_id, user_id, author_name, author_email, role, content, parent_id, is_internal, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [
            data.assistance_request_id,
            data.user_id || null,
            data.author_name || null,
            data.author_email || null,
            data.role || 'visiteur',
            data.content || null,
            data.parent_id || null,
            data.is_internal ? 1 : 0,
            data.is_read ? 1 : 0
        ];
        connection.query(sql, params, callback);
    },

    findByAssistance: (assistanceId, callback) => {
        const sql = `SELECT r.*, u.first_name as user_first_name, u.last_name as user_last_name FROM reponses_assistance r LEFT JOIN users u ON r.user_id = u.id WHERE r.assistance_request_id = ? ORDER BY r.created_at ASC`;
        connection.query(sql, [assistanceId], callback);
    },

    findById: (id, callback) => {
        const sql = `SELECT * FROM reponses_assistance WHERE id = ?`;
        connection.query(sql, [id], callback);
    },

    createAttachment: (reponseId, attachment, callback) => {
        const sql = `INSERT INTO reponse_attachments (reponse_id, storage, file_url, filename, mime_type, file_size) VALUES (?, ?, ?, ?, ?, ?)`;
        const params = [
            reponseId,
            attachment.storage || 'local',
            attachment.file_url,
            attachment.filename || null,
            attachment.mime_type || null,
            attachment.file_size || null
        ];
        connection.query(sql, params, callback);
    },

    findAttachmentsByReponse: (reponseId, callback) => {
        const sql = `SELECT * FROM reponse_attachments WHERE reponse_id = ? ORDER BY created_at ASC`;
        connection.query(sql, [reponseId], callback);
    },

    getAttachmentById: (id, callback) => {
        const sql = `SELECT * FROM reponse_attachments WHERE id = ?`;
        connection.query(sql, [id], callback);
    },

    markAsRead: (reponseId, callback) => {
        const sql = `UPDATE reponses_assistance SET is_read = 1 WHERE id = ?`;
        connection.query(sql, [reponseId], callback);
    }
};

export default Reponse;

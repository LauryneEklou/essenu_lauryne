import sequelize from '../config/sequelize.js';

// Liste tous les commentaires (pour l'admin) avec info auteur et titre de l'actualité
export const listAllCommentsForAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.per_page) || 100;
        const offset = (page - 1) * perPage;

        const sql = `
            SELECT c.*, CONCAT(IFNULL(u.first_name,''),' ',IFNULL(u.last_name,'')) AS author_name, u.email AS author_email, n.title AS news_title
            FROM comments c
            JOIN users u ON c.user_id = u.id
            JOIN news n ON c.news_id = n.id
            WHERE c.is_deleted = 0
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [rows] = await sequelize.query(sql, { replacements: [perPage, offset] });
        res.json({ data: rows, page, per_page: perPage });
    } catch (err) {
        console.error('[adminComments] error', err);
        res.status(500).json({ message: 'Erreur serveur', error: err && err.message });
    }
};

// Public (debug) listing — same SQL but no auth required. Use only for local/dev debugging.
export const listAllCommentsPublic = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.per_page) || 100;
        const offset = (page - 1) * perPage;

        const sql = `
            SELECT c.*, CONCAT(IFNULL(u.first_name,''),' ',IFNULL(u.last_name,'')) AS author_name, u.email AS author_email, n.title AS news_title
            FROM comments c
            JOIN users u ON c.user_id = u.id
            JOIN news n ON c.news_id = n.id
            WHERE c.is_deleted = 0
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [rows] = await sequelize.query(sql, { replacements: [perPage, offset] });
        res.json({ data: rows, page, per_page: perPage });
    } catch (err) {
        console.error('[publicComments] error', err);
        res.status(500).json({ message: 'Erreur serveur', error: err && err.message });
    }
};

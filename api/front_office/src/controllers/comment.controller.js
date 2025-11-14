import Comment from '../models/comment.model.js';
import Users from '../models/user.model.js';

export const listCommentsForNews = async (req, res) => {
    try {
        const newsId = req.query.news_id || req.params.newsId;
        if (!newsId) return res.status(400).json({ message: 'news_id manquant' });

        // pagination
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.per_page) || 20;
        const offset = (page - 1) * perPage;

        // use raw SQL to include author info
        const sql = `
            SELECT c.*, CONCAT(IFNULL(u.first_name,''),' ',IFNULL(u.last_name,'')) AS author_name, u.id as author_id, u.first_name, u.last_name
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.news_id = ? AND c.is_deleted = 0 AND c.parent_id IS NULL
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?
        `;
        const [comments] = await Comment.sequelize.query(sql, { replacements: [newsId, perPage, offset] });

        // fetch replies
        const parentIds = comments.map(c => c.id);
        let replies = [];
        if (parentIds.length) {
            const placeholders = parentIds.map(() => '?').join(',');
            const sqlReplies = `
                SELECT c.*, CONCAT(IFNULL(u.first_name,''),' ',IFNULL(u.last_name,'')) AS author_name, u.id as author_id, u.first_name, u.last_name
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.parent_id IN (${placeholders}) AND c.is_deleted = 0
                ORDER BY c.created_at ASC
            `;
            const [r] = await Comment.sequelize.query(sqlReplies, { replacements: parentIds });
            replies = r;
        }

        res.json({ comments, replies });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

export const createComment = async (req, res) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ message: 'Non autorisé' });

        const { news_id, parent_id, content } = req.body;
        if (!news_id || !content) return res.status(400).json({ message: 'news_id et content requis' });

        const comment = await Comment.create({ news_id, parent_id: parent_id || null, user_id: user.id, content });
        res.status(201).json(comment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

export const updateComment = async (req, res) => {
    try {
        const user = req.user;
        const id = req.params.id;
        const { content } = req.body;
        if (!user) return res.status(401).json({ message: 'Non autorisé' });
        const comment = await Comment.findByPk(id);
        if (!comment) return res.status(404).json({ message: 'Commentaire introuvable' });
        // owner or admin
        if (comment.user_id !== user.id && (!user.role || !['super_admin', 'admin_contenu'].includes(user.role))) {
            return res.status(403).json({ message: 'Permission refusée' });
        }
        comment.content = content || comment.content;
        await comment.save();
        res.json(comment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

export const deleteComment = async (req, res) => {
    try {
        const user = req.user;
        const id = req.params.id;
        if (!user) return res.status(401).json({ message: 'Non autorisé' });
        const comment = await Comment.findByPk(id);
        if (!comment) return res.status(404).json({ message: 'Commentaire introuvable' });
        // owner or admin
        if (comment.user_id !== user.id && (!user.role || !['super_admin', 'admin_contenu'].includes(user.role))) {
            return res.status(403).json({ message: 'Permission refusée' });
        }
        // soft delete
        comment.is_deleted = true;
        await comment.save();
        res.json({ message: 'Commentaire supprimé' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

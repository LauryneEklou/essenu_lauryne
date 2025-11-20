import connection from '../config/db.js';

// Return basic counts used on the dashboard
export const getDashboardStats = (req, res) => {
    try {
        const results = {};
        // Count documents
        connection.query('SELECT COUNT(*) AS cnt FROM documents', (err, docs) => {
            if (err) {
                console.error('getDashboardStats documents error', err);
                return res.status(500).json({ message: 'Erreur serveur' });
            }
            results.documents = (docs && docs[0] && docs[0].cnt) ? Number(docs[0].cnt) : 0;
            // Count news
            connection.query('SELECT COUNT(*) AS cnt FROM news', (err2, news) => {
                if (err2) {
                    console.error('getDashboardStats news error', err2);
                    return res.status(500).json({ message: 'Erreur serveur' });
                }
                results.news = (news && news[0] && news[0].cnt) ? Number(news[0].cnt) : 0;
                // Count comments
                connection.query('SELECT COUNT(*) AS cnt FROM comments', (err3, comments) => {
                    if (err3) {
                        console.error('getDashboardStats comments error', err3);
                        return res.status(500).json({ message: 'Erreur serveur' });
                    }
                    results.comments = (comments && comments[0] && comments[0].cnt) ? Number(comments[0].cnt) : 0;
                    return res.status(200).json(results);
                });
            });
        });
    } catch (e) {
        console.error('getDashboardStats unexpected error', e);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

export const getTopAuthors = (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 6;
    const sql = `
        SELECT u.id, CONCAT_WS(' ', u.first_name, u.last_name) AS label, COUNT(d.id) AS value
        FROM users u
        LEFT JOIN documents d ON d.user_id = u.id
        WHERE u.role IN ('super_admin','admin_contenu')
        GROUP BY u.id
        ORDER BY value DESC
        LIMIT ?
    `;
    connection.query(sql, [limit], (err, results) => {
        if (err) {
            console.error('getTopAuthors error', err);
            return res.status(500).json({ message: 'Erreur serveur' });
        }
        return res.status(200).json(results.map(r => ({ id: r.id, label: r.label, value: r.value })));
    });
};

export const getTopNewsByComments = (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 6;
    const sql = `
        SELECT n.id, n.title AS label, COUNT(c.id) AS comments
        FROM news n
        LEFT JOIN comments c ON c.news_id = n.id
        GROUP BY n.id
        ORDER BY comments DESC
        LIMIT ?
    `;
    connection.query(sql, [limit], (err, results) => {
        if (err) {
            console.error('getTopNewsByComments error', err);
            return res.status(500).json({ message: 'Erreur serveur' });
        }
        return res.status(200).json(results.map(r => ({ id: r.id, label: r.label, value: r.comments })));
    });
};

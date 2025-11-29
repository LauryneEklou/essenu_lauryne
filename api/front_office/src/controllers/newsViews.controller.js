import connection from '../config/db.js';

// Enregistre une vue unique par utilisateur connecté (auth requis)
export async function recordView(req, res) {
  try {
    const news_id = Number(req.body.news_id || req.query.news_id);
    if (!news_id) return res.status(400).json({ message: 'news_id manquant' });

    // user must be authenticated; middleware should set req.user
    const user = req.user || null;
    if (!user || !user.id) return res.status(401).json({ message: 'Utilisateur non authentifié' });

    const user_id = Number(user.id);

    const sqlAuth = 'INSERT IGNORE INTO news_views (news_id, user_id, created_at) VALUES (?, ?, NOW())';
    connection.query(sqlAuth, [news_id, user_id], (err, result) => {
      if (err) {
        console.error('newsViews insert error (auth)', err);
        return res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement de la vue' });
      }
      const created = (result && result.affectedRows && result.affectedRows > 0) ? true : false;
      if (created) {
        // increment cached counter on news table for fast reads
        connection.query('UPDATE news SET nb_vues = COALESCE(nb_vues,0) + 1 WHERE id = ?', [news_id], (uErr) => {
          if (uErr) console.error('failed to increment news.nb_vues', uErr);
        });
        return res.status(201).json({ message: 'Vue enregistrée', created: true });
      }
      // already existed
      return res.status(200).json({ message: 'Vue déjà enregistrée', created: false });
    });

  } catch (err) {
    console.error('recordView unexpected error', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}

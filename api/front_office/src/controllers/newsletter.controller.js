import db from '../config/db.js';

// Minimal newsletter subscription controller
// POST /api/newsletter/subscribe
export const subscribe = (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ success: false, message: 'Email requis' });
        }

        const emailTrim = email.trim().toLowerCase();
        // basic email validation
        const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        if (!re.test(emailTrim)) {
            return res.status(400).json({ success: false, message: 'Email invalide' });
        }

        // Use consistent table name: newsletter_subscribers
        const tableName = 'newsletter_subscribers';
        const insertQuery = `INSERT INTO ${tableName} (email, created_at) VALUES (?, NOW())`;

        db.query(insertQuery, [emailTrim], (err, result) => {
            if (err) {
                // If table does not exist, try to create it and then insert
                if (err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146)) {
                    const createQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (\n                            id BIGINT AUTO_INCREMENT PRIMARY KEY,\n                            email VARCHAR(255) NOT NULL UNIQUE,\n                            created_at DATETIME NOT NULL\n                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
                    return db.query(createQuery, [], (cErr) => {
                        if (cErr) {
                            console.error('Failed to create newsletter_subscribers table', cErr);
                            return res.status(500).json({ success: false, message: 'Erreur serveur' });
                        }
                        // retry insert
                        return db.query(insertQuery, [emailTrim], (iErr) => {
                            if (iErr) {
                                // duplicate key handling
                                if (iErr && iErr.code === 'ER_DUP_ENTRY') {
                                    return res.json({ success: true, message: 'Vous êtes déjà abonné·e.' });
                                }
                                console.error('Insert retry failed', iErr);
                                return res.status(500).json({ success: false, message: 'Erreur serveur' });
                            }
                            // return insert id to help debugging
                            const insertedId = result && (result.insertId || result.insert_id || null);
                            return res.json({ success: true, message: 'Abonnement pris en compte. Merci !', id: insertedId });
                        });
                    });
                }

                // duplicate email
                if (err && err.code === 'ER_DUP_ENTRY') {
                    return res.json({ success: true, message: 'Vous êtes déjà abonné·e.' });
                }

                console.error('Newsletter insert error', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            // return insert id to help debugging
            const insertedId = result && (result.insertId || result.insert_id || null);
            return res.json({ success: true, message: 'Abonnement pris en compte. Merci !', id: insertedId });
        });

    } catch (err) {
        console.error('subscribe controller error', err);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

// New: unsubscribe handler
export const unsubscribe = (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ success: false, message: 'Email requis' });
        }
        const emailTrim = email.trim().toLowerCase();

        // Debug log to ensure request reaches the controller
        console.log('[newsletter] unsubscribe request received for:', emailTrim);

        const tableName = 'newsletter_subscribers';
        const deleteQuery = `DELETE FROM ${tableName} WHERE email = ?`;

        db.query(deleteQuery, [emailTrim], (err, result) => {
            if (err) {
                console.error('Newsletter unsubscribe error', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }
            // result.affectedRows tells us if something was deleted
            if (result && result.affectedRows && result.affectedRows > 0) {
                return res.json({ success: true, message: 'Désabonnement effectué.' });
            } else {
                return res.status(404).json({ success: false, message: 'Email non trouvé.' });
            }
        });
    } catch (err) {
        console.error('unsubscribe controller error', err);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

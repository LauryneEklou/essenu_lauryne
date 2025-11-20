import { getUsersByRole, toggleUserStatusById, getUserById } from '../models/user.model.js';

export const listUsers = (req, res) => {
    const role = req.query.role || null;
    if (!role) return res.status(400).json({ message: 'role query param required' });
    getUsersByRole(role, (err, results) => {
        if (err) {
            console.error('[listUsers] DB error:', err && err.message);
            return res.status(500).json({ message: 'Erreur serveur' });
        }
        res.status(200).json(results);
    });
};

export const activateUser = (req, res) => {
    const id = req.params.id;
    if(!id) return res.status(400).json({ message: 'ID requis' });
    toggleUserStatusById(id, 'active', (err) => {
        if(err){ console.error('[activateUser] error', err && err.message); return res.status(500).json({ message: 'Erreur' }); }
        res.status(200).json({ message: 'Activé' });
    });
};

export const deactivateUser = (req, res) => {
    const id = req.params.id;
    if(!id) return res.status(400).json({ message: 'ID requis' });
    toggleUserStatusById(id, 'inactive', (err) => {
        if(err){ console.error('[deactivateUser] error', err && err.message); return res.status(500).json({ message: 'Erreur' }); }
        res.status(200).json({ message: 'Désactivé' });
    });
};

export const getUser = (req, res) => {
    const id = req.params.id;
    if(!id) return res.status(400).json({ message: 'ID requis' });
    getUserById(id, (err, results) => {
        if(err){ console.error('[getUser] error', err && err.message); return res.status(500).json({ message: 'Erreur' }); }
        return res.status(200).json((results && results[0]) || {});
    });
};

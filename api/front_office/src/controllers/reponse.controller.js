import Reponse from '../models/reponse.model.js';
import Assistance from '../models/assistance.model.js';
import fs from 'fs';
import path from 'path';

export const listReponses = (req, res) => {
    const assistId = req.params.assistId;
    // check assistance exists and permission
    Assistance.findById(assistId, (errA, rowsA) => {
        if(errA) return res.status(500).json({ message: 'Erreur serveur', error: errA });
        if(!rowsA || rowsA.length===0) return res.status(404).json({ message: 'Demande introuvable' });
        const assist = rowsA[0];
        const user = req.user || null;
        const isAdmin = user && (user.role === 'super_admin' || user.role === 'admin_accompagnement');
        const isOwner = user && assist.user_id && String(assist.user_id) === String(user.id);
        if(!isAdmin && !isOwner) return res.status(403).json({ message: 'Accès interdit' });

        Reponse.findByAssistance(assistId, (err, results) => {
            if (err) return res.status(500).json({ message: 'Erreur serveur', error: err });
            return res.json(results);
        });
    });
};

export const createReponse = (req, res) => {
    const assistId = req.params.assistId;
    const body = req.body || {};
    // DEBUG: log incoming headers and body to help diagnose missing 'content' (400)
    try{ console.log('[reponse.controller] createReponse incoming', { path: req.originalUrl, headers: req.headers, parsedBody: body, isMultipart: !!(req.files && req.files.length) }); }catch(e){}
    // validate content
    if(!body.content) return res.status(400).json({ message: 'Content missing' });

    // Prefer server-side authenticated user info if available for security
    const user = req.user || null;
    // If authenticated, use server-side role and user id/name/email to avoid spoofing from client
    const roleToSave = (user && user.role) ? user.role : (body.role || 'visiteur');
    const userIdToSave = (user && user.id) ? parseInt(user.id, 10) : (body.user_id ? parseInt(body.user_id, 10) : null);
    const authorNameToSave = (user && (user.first_name || user.name || user.nom)) ? (user.first_name ? (user.first_name + (user.last_name ? ' ' + user.last_name : '')) : (user.name || user.nom)) : (body.author_name || null);
    const authorEmailToSave = (user && user.email) ? user.email : (body.author_email || null);

    const data = {
        assistance_request_id: assistId,
        user_id: userIdToSave,
        author_name: authorNameToSave,
        author_email: authorEmailToSave,
        role: roleToSave,
        content: body.content,
        parent_id: body.parent_id || null,
        is_internal: body.is_internal === '1' || body.is_internal === 1 || body.is_internal === true,
        is_read: 0
    };

    // check assistance exists and permission (only admin or owner can create)
    Assistance.findById(assistId, (errA, rowsA) => {
        if(errA) return res.status(500).json({ message: 'Erreur serveur', error: errA });
        if(!rowsA || rowsA.length===0) return res.status(404).json({ message: 'Demande introuvable' });
        const assist = rowsA[0];
        const isAdmin = user && (user.role === 'super_admin' || user.role === 'admin_accompagnement');
        const isOwner = user && assist.user_id && String(assist.user_id) === String(user.id);
        if(!isAdmin && !isOwner) return res.status(403).json({ message: 'Accès interdit' });

        // create reply row
        Reponse.create(data, (err, result) => {
            if(err) return res.status(500).json({ message: 'Erreur création réponse', error: err });
            const reponseId = result.insertId;

            // if files uploaded (multer), save attachments
            if(req.files && Array.isArray(req.files) && req.files.length){
                const tasks = [];
                req.files.forEach(file => {
                    const attachment = {
                        storage: 'local',
                        // store attachments under uploads/pieces_jointes to match documents
                        file_url: '/uploads/pieces_jointes/' + file.filename,
                        filename: file.originalname,
                        mime_type: file.mimetype,
                        file_size: file.size
                    };
                    tasks.push(new Promise((resolve, reject) => {
                        Reponse.createAttachment(reponseId, attachment, (err2, res2) => {
                            if(err2) return reject(err2);
                            resolve(res2.insertId);
                        });
                    }));
                });
                Promise.all(tasks).then(ids => {
                    return res.status(201).json({ message: 'Réponse créée', reponseId, attachments: ids });
                }).catch(err2 => {
                    console.error('attachment save error', err2);
                    return res.status(500).json({ message: 'Erreur sauvegarde pièces jointes', error: err2 });
                });
            } else {
                return res.status(201).json({ message: 'Réponse créée', reponseId });
            }
        });
    });
};

export const getAttachment = (req, res) => {
    const attId = req.params.attId;
    Reponse.getAttachmentById(attId, (err, rows) => {
        if(err) return res.status(500).json({ message: 'Erreur serveur', error: err });
        if(!rows || rows.length === 0) return res.status(404).json({ message: 'Attachment not found' });
        const att = rows[0];
        // check permission: only admin or owner of the assistance can download
        Reponse.findById(att.reponse_id, (errR, rowsR) => {
            if(errR) return res.status(500).json({ message: 'Erreur serveur', error: errR });
            if(!rowsR || rowsR.length===0) return res.status(404).json({ message: 'Réponse introuvable' });
            const rep = rowsR[0];
            Assistance.findById(rep.assistance_request_id, (errA, rowsA) => {
                if(errA) return res.status(500).json({ message: 'Erreur serveur', error: errA });
                if(!rowsA || rowsA.length===0) return res.status(404).json({ message: 'Demande introuvable' });
                const assist = rowsA[0];
                const user = req.user || null;
                const isAdmin = user && (user.role === 'super_admin' || user.role === 'admin_accompagnement');
                const isOwner = user && assist.user_id && String(assist.user_id) === String(user.id);
                if(!isAdmin && !isOwner) return res.status(403).json({ message: 'Accès interdit' });

                // for local storage, file_url is path like /uploads/pieces_jointes/<file>
                const filepath = path.join(process.cwd(), 'uploads', 'pieces_jointes', path.basename(att.file_url));
                if(!fs.existsSync(filepath)) return res.status(404).json({ message: 'Fichier introuvable' });
                res.setHeader('Content-Type', att.mime_type || 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${att.filename || 'file'}"`);
                const stream = fs.createReadStream(filepath);
                stream.pipe(res);
            });
        });
    });
};

export const markAsRead = (req, res) => {
    const reponseId = req.params.reponseId;
    if(!reponseId) return res.status(400).json({ message: 'reponseId required' });
    // check reponse exists and permission
    Reponse.findById(reponseId, (errR, rowsR) => {
        if(errR) return res.status(500).json({ message: 'Erreur serveur', error: errR });
        if(!rowsR || rowsR.length===0) return res.status(404).json({ message: 'Réponse introuvable' });
        const rep = rowsR[0];
        Assistance.findById(rep.assistance_request_id, (errA, rowsA) => {
            if(errA) return res.status(500).json({ message: 'Erreur serveur', error: errA });
            if(!rowsA || rowsA.length===0) return res.status(404).json({ message: 'Demande introuvable' });
            const assist = rowsA[0];
            const user = req.user || null;
            const isAdmin = user && (user.role === 'super_admin' || user.role === 'admin_accompagnement');
            const isOwner = user && assist.user_id && String(assist.user_id) === String(user.id);
            if(!isAdmin && !isOwner) return res.status(403).json({ message: 'Accès interdit' });

            Reponse.markAsRead(reponseId, (errM) => {
                if(errM) return res.status(500).json({ message: 'Erreur mise à jour', error: errM });
                return res.json({ message: 'Marquée comme lue' });
            });
        });
    });
};

export default {
    listReponses,
    createReponse,
    getAttachment
 };

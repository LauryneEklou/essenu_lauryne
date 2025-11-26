// javascript
import Document from '../models/document.model.js';
import path from 'path';
import fs from 'fs/promises';
import Category from '../models/category.model.js';
import connection from '../config/db.js';
import { EventEmitter } from 'events';
import { sendMail } from '../services/mailer.service.js';

// event emitter for SSE updates
const documentsEmitter = new EventEmitter();

const getUploaded = (req, field) => {
    if (!req) return null;
    if (req.files) {
        if (Array.isArray(req.files[field]) && req.files[field].length) return req.files[field][0];
        if (req.files[field] && req.files[field].length) return req.files[field][0];
    }
    if (req.file && req.file.fieldname === field) return req.file;
    return null;
};

const buildFileUrl = (uploaded, bodyUrl, folder) => {
    if (uploaded) return `/${folder}/${uploaded.filename}`; // ex: /uploads/documents/...
    if (bodyUrl) return bodyUrl;
    return null;
};

const getCategoryName = async (categoryId) => {
    if (!categoryId) return null;
    return new Promise((resolve) => {
        Category.findById(categoryId, (err, results) => {
            if (err) {
                console.error('getCategoryName error:', err);
                return resolve(null);
            }
            if (!results || results.length === 0) return resolve(null);
            return resolve(results[0].name || null);
        });
    });
};

export const createDocument = async (req, res) => {
    try {
        const file = getUploaded(req, 'file');
        const image = getUploaded(req, 'image');

        const extension = file ? path.extname(file.originalname).substring(1) : (req.body.type || null);

        const file_url = buildFileUrl(file, req.body.file_url, 'uploads/documents');
        const image_url = buildFileUrl(image, req.body.image, 'uploads/images');

        if (!req.body.title) {
            return res.status(400).json({ message: 'Titre requis' });
        }
        if (!file_url) {
            return res.status(400).json({ message: 'Fichier requis: fournir `file_url` ou uploader `file`' });
        }

        const docPayload = {
            title: req.body.title,
            description: req.body.description || null,
            file_url,
            image: image_url,
            type: extension || null,
            category_id: req.body.category_id ? parseInt(req.body.category_id, 10) : null,
            // prefer explicit user_id from body, fallback to authenticated user id (req.user)
            user_id: req.body.user_id ? parseInt(req.body.user_id, 10) : (req.user && req.user.id ? parseInt(req.user.id, 10) : null),
            // allow explicit nb_download on create (fallback to 0)
            nb_download: typeof req.body.nb_download !== 'undefined' ? parseInt(req.body.nb_download, 10) || 0 : 0,
        };

        // debug log: show which user id will be used
        console.log('[createDocument] req.user =', req.user);
        console.log('[createDocument] docPayload.user_id =', docPayload.user_id);

        const document = await Document.create(docPayload);
        // Emit event for SSE
        documentsEmitter.emit('documents_change');

        // Respond to client immediately
        res.status(201).json({ message: 'Document créé avec succès', document });

        // Async: notify newsletter subscribers about new document
        (async () => {
            try {
                connection.query('SELECT email FROM newsletter_subscribers', async (err, results) => {
                    if (err) {
                        console.warn('[notifyDocumentSubscribers] could not fetch subscribers', err && err.message);
                        return;
                    }

                    if (!Array.isArray(results) || results.length === 0) {
                        console.info('[notifyDocumentSubscribers] no subscribers to notify');
                        return;
                    }

                    const emails = results.map(r => (r && r.email) ? String(r.email).trim() : '').filter(Boolean);
                    if (emails.length === 0) {
                        console.info('[notifyDocumentSubscribers] no valid subscriber emails');
                        return;
                    }

                    const frontUrl = process.env.FRONT_URL || 'http://localhost:4000';
                    const logoUrl = `${frontUrl.replace(/\/$/, '')}/assets/public/media/images/logo/essenu.png`;
                    // Prefer linking to documents listing; if you have per-document pages, adjust accordingly
                    const docUrl = `${frontUrl.replace(/\/$/, '')}/fr/documents-pratiques`;

                    const subject = `Nouveau document sur ESSENU — ${document.title}`;
                    const html = `
                        <div style="font-family: Arial, sans-serif; color: #222; line-height:1.4;">
                            <div style="max-width:600px;margin:0 auto;padding:20px;border:1px solid #f0f0f0;border-radius:6px;">
                                <div style="text-align:center;margin-bottom:16px;">
                                    <img src="${logoUrl}" alt="ESSENU" style="height:48px;object-fit:contain;" />
                                </div>
                                <h2 style="color:#0b5394;margin-top:0;">${escapeHtml(document.title)}</h2>
                                <div style="color:#333;margin-bottom:18px;">${document.description ? document.description : ''}</div>
                                <div style="text-align:center;margin:24px 0;">
                                    <a href="${docUrl}" style="background:#0b5394;color:#fff;padding:12px 20px;border-radius:4px;text-decoration:none;display:inline-block;">Voir le document</a>
                                </div>
                                <p style="font-size:12px;color:#666;">Vous recevez cet email car vous êtes abonné·e à la newsletter ESSENU. Pour ne plus recevoir ces messages, répondez à cet email ou gérez vos préférences sur notre site.</p>
                            </div>
                        </div>
                    `;

                    const text = `Nouveau document sur ESSENU - ${document.title}\n\n${stripHtml(document.description || '')}\n\nVoir: ${docUrl}`;

                    const batchSize = parseInt(process.env.MAIL_BCC_BATCH_SIZE || '100', 10) || 100;
                    for (let i = 0; i < emails.length; i += batchSize) {
                        const chunk = emails.slice(i, i + batchSize);
                        try {
                            const result = await sendMail({ bcc: chunk.join(','), subject, html, text });
                            if (result && result.success) {
                                console.info(`[notifyDocumentSubscribers] batch ${Math.floor(i/batchSize)+1} sent, recipients=${chunk.length}`);
                            } else {
                                console.warn('[notifyDocumentSubscribers] sendMail failed for batch', { err: result && result.error });
                            }
                        } catch (sendErr) {
                            console.error('[notifyDocumentSubscribers] unexpected send error', sendErr && sendErr.message);
                        }
                    }
                });
            } catch (outerErr) {
                console.error('[notifyDocumentSubscribers] unexpected error', outerErr && outerErr.message);
            }
        })().catch(e => console.error('[notifyDocumentSubscribers] top-level error', e && e.message));

        return;
    } catch (error) {
        console.error('createDocument error:', error);
        return res.status(500).json({ message: 'Erreur lors de la création du document' });
    }
};

// export const getAllDocuments = async (req, res) => {
//     try {
//         const documents = await Document.findAll();
//         res.status(200).json(documents);
//     } catch (error) {
//         console.error('getAllDocuments error:', error);
//         res.status(500).json({ message: 'Erreur lors de la récupération des documents' });
//     }
// };

export const getAllDocuments = (req, res) => {
    try {
        // déterminer l'utilisateur connecté si présent (injection par verifyToken)
        const currentUserId = req.user && (req.user.id || req.user.user_id) ? parseInt(req.user.id || req.user.user_id, 10) : null;
        const userRole = req.user && req.user.role ? String(req.user.role) : null;

        // Si l'utilisateur est super_admin ou admin_contenu, il peut voir tous les documents
        const isPrivileged = (userRole === 'super_admin' || userRole === 'admin_contenu');

        let sql = `
            SELECT d.*, c.name AS category_name, CONCAT_WS(' ', u.first_name, u.last_name) AS author
            FROM documents d
            LEFT JOIN categories c ON d.category_id = c.id
            LEFT JOIN users u ON d.user_id = u.id
        `;
        const params = [];

        if (!isPrivileged && currentUserId) {
            sql += ` WHERE d.user_id = ?`;
            params.push(currentUserId);
        }

        connection.query(sql, params, (err, results) => {
            if (err) {
                console.error('Erreur lors de la récupération des documents:', err);
                return res.status(500).json({ message: 'Erreur lors de la récupération des documents' });
            }
            // results est un tableau d'objets contenant category_name
            return res.status(200).json(results);
        });
    } catch (error) {
        console.error('getAllDocuments error:', error);
        return res.status(500).json({ message: 'Erreur lors de la récupération des documents' });
    }
};
export const getDocumentById = async (req, res) => {
    try {
        const document = await Document.findByPk(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document introuvable' });

        // Récupérer l'ID de l'utilisateur connecté (injection faite par verifyToken)
        const currentUserId = req.user && (req.user.id || req.user.user_id) ? parseInt(req.user.id || req.user.user_id, 10) : null;

        // Déterminer si l'utilisateur connecté est le propriétaire du document
        const isOwner = currentUserId && document.user_id ? (currentUserId === parseInt(document.user_id, 10)) : false;

        // Récupérer le nom de la catégorie si disponible
        const category_name = await getCategoryName(document.category_id);

        // Convertir l'instance (si Sequelize) en objet JS et injecter category_name
        const docObj = (typeof document.toJSON === 'function') ? document.toJSON() : { ...document };
        if (category_name) docObj.category_name = category_name;

        // debug logs pour vérifier les valeurs retournées
        console.log('[getDocumentById] id=', req.params.id, 'currentUserId=', currentUserId, 'isOwner=', isOwner, 'category_name=', category_name);
        console.log('[getDocumentById] document', docObj);

        // Renvoie le document + meta utile pour l'affichage côté client
        return res.status(200).json({ document: docObj, currentUserId, isOwner });
    } catch (error) {
        console.error('getDocumentById error:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération du document' });
    }
};

export const updateDocument = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ message: 'ID invalide' });

        const existing = await Document.findByPk(id);
        if (!existing) return res.status(404).json({ message: 'Document introuvable' });

        // Authorization: allow if super_admin/admin_contenu or owner
        const currentUserId = req.user && (req.user.id || req.user.user_id) ? parseInt(req.user.id || req.user.user_id, 10) : null;
        const userRole = req.user && req.user.role ? String(req.user.role) : null;
        const isPrivileged = (userRole === 'super_admin' || userRole === 'admin_contenu');
        if (!isPrivileged && (!currentUserId || currentUserId !== parseInt(existing.user_id, 10))) {
            return res.status(403).json({ message: 'Accès refusé' });
        }

        const file = getUploaded(req, 'file');
        const image = getUploaded(req, 'image');

        const updates = { ...req.body };

        // Handle file replacement: delete old local file if exists and new file uploaded
        if (file) {
            // delete previous file if local
            if (existing.file_url && !/^https?:\/\//i.test(existing.file_url)) {
                try {
                    const oldPath = path.join(process.cwd(), existing.file_url);
                    await fs.unlink(oldPath);
                    console.log('[updateDocument] old file removed:', oldPath);
                } catch (e) {
                    // ne pas bloquer si le fichier n'existe pas
                    console.warn('[updateDocument] impossible de supprimer ancien fichier:', e && e.message);
                }
            }
            updates.file_url = `/uploads/documents/${file.filename}`;
        }

        if (image) {
            if (existing.image && !/^https?:\/\//i.test(existing.image)) {
                try {
                    const oldImgPath = path.join(process.cwd(), existing.image);
                    await fs.unlink(oldImgPath);
                    console.log('[updateDocument] old image removed:', oldImgPath);
                } catch (e) {
                    console.warn('[updateDocument] impossible de supprimer ancienne image:', e && e.message);
                }
            }
            updates.image = `/uploads/images/${image.filename}`;
        }

        if (updates.category_id) updates.category_id = parseInt(updates.category_id, 10);
        if (typeof updates.user_id !== 'undefined' && updates.user_id !== null && updates.user_id !== '') {
            updates.user_id = parseInt(updates.user_id, 10);
        } else if (req.user && req.user.id) {
            updates.user_id = parseInt(req.user.id, 10);
        }

        if (typeof updates.nb_download !== 'undefined') {
            const parsed = parseInt(updates.nb_download, 10);
            updates.nb_download = Number.isNaN(parsed) ? 0 : parsed;
        }

        const [affected] = await Document.update(updates, { where: { id } });
        if (!affected) return res.status(404).json({ message: 'Document introuvable' });

        // Emit event for SSE
        documentsEmitter.emit('documents_change');

        return res.status(200).json({ message: 'Document mis à jour avec succès' });
    } catch (error) {
        console.error('updateDocument error:', error);
        return res.status(500).json({ message: 'Erreur lors de la mise à jour du document' });
    }
};

export const deleteDocument = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ message: 'ID invalide' });

        const doc = await Document.findByPk(id);
        if (!doc) return res.status(404).json({ message: 'Document introuvable' });

        // Diagnostic logs
        console.log('[deleteDocument] req.user=', req.user);
        console.log('[deleteDocument] doc.user_id=', doc.user_id);

        // Authorization: allow if super_admin/admin_contenu or owner
        const currentUserId = req.user && (req.user.id || req.user.user_id) ? (req.user.id || req.user.user_id) : null;
        const userRole = req.user && req.user.role ? String(req.user.role) : null;
        const isPrivileged = (userRole === 'super_admin' || userRole === 'admin_contenu');

        console.log('[deleteDocument] authorization check: currentUserId=', currentUserId, 'typeof=', typeof currentUserId, 'userRole=', userRole, 'doc.user_id=', doc.user_id, 'typeof doc.user_id=', typeof doc.user_id);

        // compare as strings to avoid type mismatch
        const isOwner = (currentUserId !== null && doc.user_id !== null && String(currentUserId) === String(doc.user_id));
        if (!isPrivileged && !isOwner) {
            console.warn('[deleteDocument] access denied: not owner and not privileged', { currentUserId, docUserId: doc.user_id, userRole });
            return res.status(403).json({ message: 'Accès refusé', currentUserId: currentUserId, docUserId: doc.user_id });
        }

        // Remove local files if present
        if (doc.file_url && !/^https?:\/\//i.test(doc.file_url)) {
            try {
                const filePath = path.join(process.cwd(), doc.file_url);
                await fs.unlink(filePath);
                console.log('[deleteDocument] file removed:', filePath);
            } catch (e) {
                console.warn('[deleteDocument] impossible de supprimer le fichier:', e && e.message);
            }
        }
        if (doc.image && !/^https?:\/\//i.test(doc.image)) {
            try {
                const imgPath = path.join(process.cwd(), doc.image);
                await fs.unlink(imgPath);
                console.log('[deleteDocument] image removed:', imgPath);
            } catch (e) {
                console.warn('[deleteDocument] impossible de supprimer l\'image:', e && e.message);
            }
        }

        const deleted = await Document.destroy({ where: { id } });
        if (!deleted) return res.status(404).json({ message: 'Document introuvable' });

        // Emit event for SSE
        documentsEmitter.emit('documents_change');

        return res.status(200).json({ message: 'Document supprimé avec succès' });
    } catch (error) {
        console.error('deleteDocument error:', error);
        return res.status(500).json({ message: 'Erreur lors de la suppression du document' });
    }
};

// New: download endpoint that increments nb_download then streams or redirects
export const downloadDocument = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ message: 'ID invalide' });

        const doc = await Document.findByPk(id);
        if (!doc) return res.status(404).json({ message: 'Document introuvable' });

        // Increment the download counter safely
        await doc.increment('nb_download', { by: 1 });

        // Emit event for SSE so dashboards update
        try { documentsEmitter.emit('documents_change'); } catch(e) { console.warn('SSE emit error', e); }

        const fileUrl = doc.file_url;
        if (!fileUrl) return res.status(404).json({ message: 'Aucun fichier associé au document' });

        // If external URL, redirect the client
        if (/^https?:\/\//i.test(fileUrl)) {
            return res.redirect(fileUrl);
        }

        // Assume local file path like /uploads/documents/xxx.pdf
        const absolutePath = path.join(process.cwd(), fileUrl);

        try {
            await fs.access(absolutePath);
        } catch (err) {
            return res.status(404).json({ message: 'Fichier local introuvable' });
        }

        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(absolutePath)}"`);
        return res.sendFile(absolutePath);
    } catch (error) {
        console.error('downloadDocument error:', error);
        return res.status(500).json({ message: 'Erreur lors du téléchargement' });
    }
};

export const getCategoriesStats = (req, res) => {
    const sql = `SELECT c.name AS label, COUNT(d.id) AS value
                 FROM categories c
                 LEFT JOIN documents d ON d.category_id = c.id
                 GROUP BY c.id
                 ORDER BY value DESC`;
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('getCategoriesStats error:', err);
            return res.status(500).json({ message: 'Erreur serveur' });
        }
        return res.status(200).json(results.map(r => ({ label: r.label, value: r.value })));
    });
};

export const getTopDownloads = (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 8;
    const sql = `SELECT d.title AS label, COALESCE(d.nb_download,0) AS downloads
                 FROM documents d
                 ORDER BY downloads DESC
                 LIMIT ?`;
    connection.query(sql, [limit], (err, results) => {
        if (err) {
            console.error('getTopDownloads error:', err);
            return res.status(500).json({ message: 'Erreur serveur' });
        }
        return res.status(200).json(results.map(r => ({ label: r.label, downloads: r.downloads })));
    });
};

export const streamDocuments = (req, res) => {
    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    // helper to send event
    const send = async (data) => {
        try {
            res.write(`event: documents_update\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (e) {
            console.error('SSE send error', e);
        }
    };

    // send initial payload (counts)
    (async () => {
        try {
            const cats = await new Promise((resolve) => {
                const sql = `SELECT c.name AS label, COUNT(d.id) AS value FROM categories c LEFT JOIN documents d ON d.category_id = c.id GROUP BY c.id ORDER BY value DESC`;
                connection.query(sql, (err, results) => {
                    if (err) return resolve([]);
                    return resolve(results.map(r => ({ label: r.label, value: r.value })));
                });
            });
            const tops = await new Promise((resolve) => {
                const sql = `SELECT d.title AS label, COALESCE(d.nb_download,0) AS downloads FROM documents d ORDER BY downloads DESC LIMIT 8`;
                connection.query(sql, (err, results) => {
                    if (err) return resolve([]);
                    return resolve(results.map(r => ({ label: r.label, downloads: r.downloads })));
                });
            });
            send({ categories: cats, top_downloads: tops });
        } catch (e) {
            // ignore
        }
    })();

    const onChange = () => {
        // send a lightweight event, client will re-fetch the data
        send({ changed: true, ts: Date.now() });
    };

    documentsEmitter.on('documents_change', onChange);

    // cleanup on client close
    req.on('close', () => {
        documentsEmitter.removeListener('documents_change', onChange);
    });
};

// helpers (reused here)
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function stripHtml(html) {
    if (!html) return '';
    return String(html).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

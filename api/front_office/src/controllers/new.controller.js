import News from '../models/new.model.js';
import fs from 'fs';
import path from 'path';
import { Category } from '../models/category.model.js';
import Users  from '../models/user.model.js';
import NewsView from '../models/news_view.model.js';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { sendMail } from '../services/mailer.service.js';


// javascript
export const getAllNews = async (req, res) => {
    try {
        const sql = `
            SELECT n.*, c.name AS category_name, CONCAT(IFNULL(u.first_name,''),' ',IFNULL(u.last_name,'')) AS author_name
            FROM news n
            LEFT JOIN categories c ON n.category_id = c.id
            LEFT JOIN users u ON n.published_by = u.id
            ORDER BY n.created_at DESC
        `;
        const [results] = await News.sequelize.query(sql);
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
};


// GET single news
export const getNewsById = async (req, res) => {
    try {
        console.debug('[getNewsById] called with id=', req.params.id);
        // determine current user id from cookie or Authorization header (JWT)
        let currentUserId = null;
        try {
            const token = (req.cookies && req.cookies.token) || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
            console.debug('[getNewsById] token present?', !!token);
            if (token) {
                const payload = jwt.verify(token, process.env.JWT_SECRET);
                currentUserId = payload && payload.id ? payload.id : null;
                console.debug('[getNewsById] token payload id=', currentUserId);
            }
        } catch (e) {
            // ignore token errors — treat as anonymous
            console.debug('[getNewsById] token verify failed or absent', e && e.message);
            currentUserId = null;
        }

        const news = await News.findByPk(req.params.id);
        if (!news) return res.status(404).json({ message: "Actualité non trouvée" });

        // respond immediately so client can read the article even if view recording fails
        try { res.json(news); } catch(e) { /* ignore send errors */ }

        // If we have a logged-in user, record a view only if not already recorded (background, non-blocking)
        if (currentUserId) {
            (async () => {
                const sequelizeInstance = News.sequelize;
                try {
                    await sequelizeInstance.transaction(async (t) => {
                        const existing = await NewsView.findOne({ where: { news_id: news.id, user_id: currentUserId }, transaction: t });
                        if (!existing) {
                            try {
                                await NewsView.create({ news_id: news.id, user_id: currentUserId }, { transaction: t });
                                await news.increment('nb_vues', { by: 1, transaction: t });
                                // no need to reload for background task
                                console.debug('[getNewsById][bg] recorded view', { news_id: news.id, user_id: currentUserId });
                            } catch (e) {
                                // ignore duplicate key or other race conditions
                                console.warn('[getNewsById][bg] create view failed', e && e.message);
                            }
                        } else {
                            console.debug('[getNewsById][bg] view already recorded for', { news_id: news.id, user_id: currentUserId });
                        }
                    });
                } catch (incErr) {
                    console.warn('[getNewsById][bg] failed to record view', incErr && incErr.message);
                }
            })().catch(err => console.warn('[getNewsById][bg] unexpected error', err && err.message));
            return;
        }

        // if no current user, we already returned the article above
        return;
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
};
// JavaScript
export const getNewsByUser = async (req, res) => {
    try {
        const rawId = req.params.userId ?? req.params.id;
        if (!rawId) return res.status(400).json({ message: "Identifiant utilisateur manquant" });

        const userId = parseInt(rawId, 10);
        if (Number.isNaN(userId)) return res.status(400).json({ message: "Identifiant utilisateur invalide" });

        const news = await News.findAll({ where: { published_by: userId } });
        return res.json(news);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
};

// Helper: render EditorJS blocks to simple HTML string (keeps basic formatting)
function renderEditorJsToHtml(blocks){
    if(!Array.isArray(blocks)) return '';
    return blocks.map(b => {
        const type = b.type;
        const d = b.data || {};
        if(type === 'header'){
            const level = d.level || 2;
            return `<h${level}>${String(d.text || '')}</h${level}>`;
        }
        if(type === 'paragraph'){
            return `<p>${String(d.text || '')}</p>`;
        }
        if(type === 'list'){
            const tag = (d.style === 'ordered') ? 'ol' : 'ul';
            const items = Array.isArray(d.items) ? d.items.map(it => `<li>${String(it)}</li>`).join('') : '';
            return `<${tag}>${items}</${tag}>`;
        }
        if(type === 'quote'){
            return `<blockquote>${String(d.text || '')}<footer>${String(d.caption || '')}</footer></blockquote>`;
        }
        if(type === 'image'){
            const src = (d.file && d.file.url) ? d.file.url : (d.url || '');
            return src ? `<p><img src="${String(src)}" style="max-width:100%"/></p>` : '';
        }
        // fallback: output raw JSON for unknown blocks
        try{ return `<pre>${JSON.stringify(b)}</pre>`; }catch(e){ return ''; }
    }).join('');
}

// CREATE news
export const createNews = async (req, res) => {
    try {
        // Log incoming body and file for debugging
        console.log('[createNews] req.body keys:', Object.keys(req.body || {}));
        console.log('[createNews] raw description type:', typeof req.body.description);
        try{ console.log('[createNews] raw description preview:', (req.body.description && String(req.body.description).slice(0,200)) || '<<empty>>'); }catch(e){}
        console.log('[createNews] req.file present:', !!req.file, req.file ? { originalname: req.file.originalname, filename: req.file.filename, size: req.file.size } : null);

        let { title, description, category_id, published_by } = req.body;

        // If description is an array (e.g. [editorJsJsonString, plainText]) handle common patterns
        if (Array.isArray(description)) {
            try {
                // Prefer first element if it's EditorJS JSON string
                const first = description[0];
                const second = description[1];
                if (typeof first === 'string' && (first.trim().startsWith('{') || first.trim().startsWith('[')) && first.indexOf('blocks') !== -1) {
                    try {
                        const parsed = JSON.parse(first);
                        if (parsed && Array.isArray(parsed.blocks)) {
                            description = renderEditorJsToHtml(parsed.blocks);
                            console.log('[createNews] description (array) parsed first element as EditorJS JSON -> HTML');
                        } else {
                            description = String(second || first || '');
                        }
                    } catch (e) {
                        description = String(second || first || '');
                    }
                } else if (typeof second === 'string' && second.trim()) {
                    description = String(second);
                    console.log('[createNews] description (array) using second element as plain text');
                } else if (typeof first === 'string') {
                    description = String(first);
                } else {
                    description = JSON.stringify(description);
                }
            } catch (e) {
                description = JSON.stringify(description);
            }
        }

        // If description looks like EditorJS JSON (stringified or object), convert to HTML
        try{
            if(description && typeof description === 'string'){
                const t = description.trim();
                if((t.startsWith('{') || t.startsWith('[')) && t.indexOf('blocks') !== -1){
                    try{
                        const parsed = JSON.parse(t);
                        if(parsed && Array.isArray(parsed.blocks)){
                            description = renderEditorJsToHtml(parsed.blocks);
                            console.log('[createNews] description parsed from JSON EditorJS to HTML (len=' + (description.length) + ')');
                        }
                    }catch(e){ /* not JSON, ignore */ }
                }
            } else if(description && typeof description === 'object' && Array.isArray(description.blocks)){
                description = renderEditorJsToHtml(description.blocks);
                console.log('[createNews] description converted from object blocks to HTML');
            }
        }catch(e){ console.warn('[createNews] error while trying to normalize description', e && e.message); }

        // Ensure description is a string for Sequelize
        if (description && typeof description !== 'string') {
            try { description = JSON.stringify(description); } catch(e) { description = String(description); }
        }

        const image = req.file ? `/uploads/images/${req.file.filename}` : null;

        const newNews = await News.create({
            title,
            description,
            image,
            category_id,
            published_by
        });

        res.status(201).json(newNews);

        // --- Async: notify newsletter subscribers ---
        (async () => {
            try {
                // fetch subscribers
                db.query('SELECT email FROM newsletter_subscribers', async (err, results) => {
                    if (err) {
                        console.warn('[notifySubscribers] could not fetch newsletter_subscribers', err && err.message);
                        return;
                    }

                    if (!Array.isArray(results) || results.length === 0) {
                        console.info('[notifySubscribers] no subscribers to notify');
                        return;
                    }

                    const emails = results.map(r => (r && r.email) ? String(r.email).trim() : '').filter(Boolean);
                    if (emails.length === 0) {
                        console.info('[notifySubscribers] no valid subscriber emails');
                        return;
                    }

                    // Build email content
                    const frontUrl = process.env.FRONT_URL || 'http://localhost:4000';
                    const logoUrl = `${frontUrl.replace(/\/$/, '')}/assets/public/media/images/logo/essenu.png`;
                    const newsUrl = `${frontUrl.replace(/\/$/, '')}/news/${newNews.id}`;

                    const subject = `Du nouveau sur ESSENU — ${title}`;

                    const html = `
                        <div style="font-family: Arial, sans-serif; color: #222; line-height:1.4;">
                            <div style="max-width:600px;margin:0 auto;padding:20px;border:1px solid #f0f0f0;border-radius:6px;">
                                <div style="text-align:center;margin-bottom:16px;">
                                    <img src="${logoUrl}" alt="ESSENU" style="height:48px;object-fit:contain;" />
                                </div>
                                <h2 style="color:#0b5394;margin-top:0;">${escapeHtml(title)}</h2>
                                <div style="color:#333;margin-bottom:18px;">${description ? description : ''}</div>
                                <div style="text-align:center;margin:24px 0;">
                                    <a href="${newsUrl}" style="background:#0b5394;color:#fff;padding:12px 20px;border-radius:4px;text-decoration:none;display:inline-block;">Voir l\'article</a>
                                </div>
                                <p style="font-size:12px;color:#666;">Vous recevez cet email car vous êtes abonné·e à la newsletter ESSENU. Pour ne plus recevoir ces messages, répondez à cet email ou gérez vos préférences sur notre site.</p>
                            </div>
                        </div>
                    `;

                    const text = `Du nouveau sur ESSENU - ${title}\n\n${stripHtml(description || '')}\n\nVoir: ${newsUrl}`;

                    // Send in BCC batches to avoid hitting provider limits
                    const batchSize = parseInt(process.env.MAIL_BCC_BATCH_SIZE || '100', 10) || 100;
                    for (let i = 0; i < emails.length; i += batchSize) {
                        const chunk = emails.slice(i, i + batchSize);
                        try {
                            const result = await sendMail({ bcc: chunk.join(','), subject, html, text });
                            if (result && result.success) {
                                console.info(`[notifySubscribers] batch ${Math.floor(i/batchSize)+1} sent, recipients=${chunk.length}`);
                            } else {
                                console.warn('[notifySubscribers] sendMail failed for batch', { err: result && result.error });
                            }
                        } catch (sendErr) {
                            console.error('[notifySubscribers] unexpected send error', sendErr && sendErr.message);
                        }
                    }
                });
            } catch (outerErr) {
                console.error('[notifySubscribers] unexpected error', outerErr && outerErr.message);
            }
        })().catch(e => console.error('[notifySubscribers] top-level error', e && e.message));

        return;
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
};

// UPDATE news
export const updateNews = async (req, res) => {
    try {
        const { title, description, category_id, published_by } = req.body;
        const news = await News.findByPk(req.params.id);
        if (!news) return res.status(404).json({ message: "Actualité non trouvée" });

        if (req.file) {
            // supprimer ancienne image si existante
            if (news.image) {
                fs.unlinkSync(path.join('uploads/images', path.basename(news.image)));
            }
            news.image = `/uploads/images/${req.file.filename}`;
        }

        news.title = title ?? news.title;
        news.description = description ?? news.description;
        news.category_id = category_id ?? news.category_id;
        news.published_by = published_by ?? news.published_by;

        await news.save();
        res.json(news);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
};

// DELETE news
export const deleteNews = async (req, res) => {
    try {
        const news = await News.findByPk(req.params.id);
        if (!news) return res.status(404).json({ message: "Actualité non trouvée" });

        if (news.image) {
            fs.unlinkSync(path.join('uploads/images', path.basename(news.image)));
        }

        await news.destroy();
        res.json({ message: "Actualité supprimée" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
};

// helpers (inserted near bottom of file)
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

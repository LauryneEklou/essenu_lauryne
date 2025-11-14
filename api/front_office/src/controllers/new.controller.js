import News from '../models/new.model.js';
import fs from 'fs';
import path from 'path';
import { Category } from '../models/category.model.js';
import Users  from '../models/user.model.js';


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
        const news = await News.findByPk(req.params.id);
        if (!news) return res.status(404).json({ message: "Actualité non trouvée" });
        res.json(news);
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

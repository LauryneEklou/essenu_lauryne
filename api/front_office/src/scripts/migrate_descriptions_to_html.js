// Migration script: convert EditorJS JSON descriptions (or arrays like [json, plain]) to HTML
// Usage: node src/scripts/migrate_descriptions_to_html.js

import sequelize from '../config/sequelize.js';
import News from '../models/new.model.js';
import { Op } from 'sequelize';

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
        try{ return `<pre>${JSON.stringify(b)}</pre>`; }catch(e){ return ''; }
    }).join('');
}

async function migrate(){
    try{
        await sequelize.authenticate();
        console.log('DB connected');
        // Find news where description looks like JSON or array (heuristic)
        const news = await News.findAll();
        console.log('Found', news.length, 'news entries');
        let updated = 0;
        for(const n of news){
            let desc = n.description;
            let updatedDesc = null;
            if(!desc) continue;
            try{
                // If desc is string and looks like JSON EditorJS
                if(typeof desc === 'string'){
                    const t = desc.trim();
                    if((t.startsWith('{') || t.startsWith('[')) && t.indexOf('blocks') !== -1){
                        try{
                            const parsed = JSON.parse(t);
                            if(parsed && Array.isArray(parsed.blocks)){
                                updatedDesc = renderEditorJsToHtml(parsed.blocks);
                            }
                        }catch(e){ /* not json */ }
                    }
                } else if(Array.isArray(desc)){
                    // desc is array, handle first/second
                    const first = desc[0];
                    const second = desc[1];
                    if(typeof first === 'string' && (first.trim().startsWith('{') || first.trim().startsWith('[')) && first.indexOf('blocks') !== -1){
                        try{ const parsed = JSON.parse(first); if(parsed && Array.isArray(parsed.blocks)) updatedDesc = renderEditorJsToHtml(parsed.blocks); }catch(e){}
                    } else if(typeof second === 'string'){
                        updatedDesc = String(second);
                    } else if(typeof first === 'string'){
                        updatedDesc = String(first);
                    }
                }
            }catch(e){ console.warn('error processing id', n.id, e && e.message); }

            if(updatedDesc && updatedDesc !== String(desc)){
                n.description = updatedDesc;
                await n.save();
                updated++;
                console.log('Updated id', n.id);
            }
        }
        console.log('Migration done. Updated', updated, 'entries');
        process.exit(0);
    }catch(e){
        console.error('Migration error', e && e.stack);
        process.exit(1);
    }
}

migrate();


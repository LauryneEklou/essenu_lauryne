import dotenv from 'dotenv';
import db from '../src/config/db.js';
import { sendMail } from '../src/services/mailer.service.js';

dotenv.config();

(async function(){
    try{
        db.query('SELECT email FROM newsletter_subscribers', async (err, results) => {
            if(err){
                console.error('Could not query newsletter_subscribers', err);
                process.exit(1);
            }
            const emails = Array.isArray(results) ? results.map(r => r.email).filter(Boolean) : [];

            const frontUrl = process.env.FRONT_URL || 'http://localhost:4000';
            const logoUrl = `${frontUrl.replace(/\/$/, '')}/assets/public/media/images/logo/essenu.png`;
            const subject = 'Test envoi newsletter - ESSENU';
            const html = `<div style="font-family:Arial,sans-serif"><img src="${logoUrl}" style="height:48px" /><h2>Test newsletter</h2><p>Ceci est un test.</p></div>`;
            const text = 'Ceci est un test.';

            if(emails.length === 0){
                console.log('No subscribers found. Sending test email to MAIL_FROM instead.');
                const resp = await sendMail({ to: process.env.MAIL_FROM, subject, html, text });
                console.log('sendMail response', resp);
                process.exit(0);
            }

            const resp = await sendMail({ bcc: emails.join(','), subject, html, text });
            console.log('sendMail response', resp);
            process.exit(0);
        });
    }catch(e){
        console.error('Unexpected error', e);
        process.exit(1);
    }
})();


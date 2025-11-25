import dotenv from 'dotenv';
import { mailerQueue } from '../services/mailerQueue.js';
import { sendMail } from '../services/mailer.service.js';

dotenv.config();

console.log('[mailer.worker] starting...');

mailerQueue.process(async (job) => {
    const { to, bcc, subject, html, text } = job.data || {};
    console.log('[mailer.worker] processing job id=', job.id, 'subject=', subject, 'recipients bcc=', Array.isArray(bcc) ? bcc.length : (bcc ? bcc.split(',').length : 0));
    const res = await sendMail({ to, bcc, subject, html, text });
    if (!res.success) {
        throw new Error('sendMail failed: ' + (res.error && res.error.message ? res.error.message : JSON.stringify(res)));
    }
    return res.info || { ok: true };
});

mailerQueue.on('completed', (job) => {
    console.log('[mailer.worker] job completed id=', job.id);
});
mailerQueue.on('failed', (job, err) => {
    console.error('[mailer.worker] job failed id=', job.id, 'err=', err && err.message);
});

process.on('SIGINT', async () => {
    console.log('[mailer.worker] shutting down');
    await mailerQueue.close();
    process.exit(0);
});

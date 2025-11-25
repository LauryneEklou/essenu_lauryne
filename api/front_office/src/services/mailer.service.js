import nodemailer from 'nodemailer';

let transporter = null;

function initTransporter() {
    if (transporter) return transporter;

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true' || (port === 465);

    if (!host || !user || !pass) {
        console.warn('[mailer] SMTP configuration incomplete. Emails will not be sent. Set SMTP_HOST, SMTP_USER, SMTP_PASS.');
        return null;
    }

    transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass }
    });

    return transporter;
}

export async function sendMail({ to, bcc, subject, html, text }) {
    try {
        const t = initTransporter();
        if (!t) {
            console.warn('[mailer] transporter not initialized — skipping sendMail');
            return { success: false, message: 'SMTP not configured' };
        }

        const fromAddr = process.env.MAIL_FROM || process.env.SMTP_USER;
        const fromName = process.env.MAIL_FROM_NAME || '';
        const from = fromName ? `${fromName} <${fromAddr}>` : fromAddr;

        // build mail options; allow bcc array or comma separated string
        const mailOptions = { from, subject };
        // fallback: some SMTP servers require a to address. If to is missing and bcc exists, set to MAIL_FROM
        if (!to && bcc) {
            mailOptions.to = fromAddr; // fallback to sender address
        } else if (to) {
            mailOptions.to = to;
        }
        if (bcc) mailOptions.bcc = bcc;
        if (html) mailOptions.html = html;
        if (text) mailOptions.text = text;

        const info = await t.sendMail(mailOptions);
        return { success: true, info };
    } catch (err) {
        console.error('[mailer] sendMail error', err && err.message);
        return { success: false, error: err };
    }
}

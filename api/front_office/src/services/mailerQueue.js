import Queue from 'bull';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;

export const mailerQueue = new Queue('mailer', redisUrl);

export async function enqueueMail(payload, opts = {}) {
    // payload: { to, bcc, subject, html, text }
    return mailerQueue.add(payload, { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, ...opts });
}


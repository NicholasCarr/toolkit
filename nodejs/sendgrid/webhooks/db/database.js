import pool from '../libs/pool.js';
import logger from '../utils/logger.js';

const database = {};

database.sendgrid = async (webhookEvents) => {
    if (!Array.isArray(webhookEvents)) {
        webhookEvents = [webhookEvents];
    }

    const results = [];
    for (const event of webhookEvents) {
        try {
            const values = [
                new Date(event.timestamp * 1000), // Convert Unix timestamp to Date
                new Date(event.timestamp * 1000), // sg_timestamp
                event.event,
                event.email,
                event.sg_event_id,
                event.sg_message_id,
                event.sg_template_id || null,
                event.campaign_id || null,
                event.send_at ? new Date(event.send_at * 1000) : null,
                event.response || null,
                event.category ? JSON.stringify(event.category) : null,
                event['smtp-id'] || null,
                event.ip || null,
                event.useragent || null,
                event.url || null,
                event.reason || null,
                event.status || null,
                event.asm_group_id || null,
                event.tls || null,
                event.marketing_campaign_id || null,
                JSON.stringify(event)
            ];

            const query = `
                INSERT INTO sg_event_logs (
                    timestamp, sg_timestamp, event_type, email, sg_event_id,
                    sg_message_id, sg_template_id, campaign_id, send_at,
                    response, category, smtp_id, ip, user_agent,
                    url, reason, status, asm_group_id, tls,
                    marketing_campaign_id, payload
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const result = await pool.query(query, values);
            results.push(result);
        } catch (err) {
            logger.error("Insert SendGrid webhook failed", err);
            results.push({
                message: "Insert SendGrid webhook failed",
                error: err
            });
        }
    }
    return results;
};

export default database;
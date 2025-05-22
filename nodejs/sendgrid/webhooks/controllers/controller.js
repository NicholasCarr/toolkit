import logger from '../utils/logger.js';
import database from '../db/database.js';

export const webhook = async (req, res) => {
    logger.info(`Received SendGrid webhook: ${JSON.stringify(req.body, null, 2)}`);
    try {
        // Send success response
        res.status(200).json({
            success: true
        });
        const payload = req.body;
        await database.sendgrid(payload);
    } catch (error) {
        logger.error(`Error processing SendGrid webhook: ${error}`);
    }
}; 
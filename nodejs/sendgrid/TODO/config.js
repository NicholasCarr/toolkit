// Move configuration to a separate file
// config.js
export default {
    sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY,
        templates: {
            dataBreachNotification: process.env.SENDGRID_TEMPLATE_ID
        },
        from: {
            email: process.env.FROM_EMAIL,
            name: process.env.FROM_NAME
        }
    },
    database: {
        // Database config
    },
    processing: {
        batchSize: 50,
        delayBetweenEmails: 2000,
        delayBetweenBatches: 5000
    }
};

// Then import and use
import config from './config.js';
sgMail.setApiKey(config.sendgrid.apiKey);
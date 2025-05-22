// Add structured error handling
try {
    // Your code here
} catch (error) {
    if (error.response) {
        logger.error(`SendGrid API error: ${error.response.status}`, {
            body: error.response.body,
            headers: error.response.headers,
            recordNo: client['Record No']
        });
    } else {
        logger.error('Error sending email', {
            error: error.message,
            stack: error.stack,
            recordNo: client['Record No']
        });
    }
    
    // Record failure in database
    await pool.query(
        'INSERT INTO email_messages (incident_id, contact_id, template_id, status, error_message) VALUES (?, ?, ?, ?, ?)',
        [currentIncidentId, contactId, templateId, 'failed', error.message]
    );
}
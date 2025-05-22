// Replace JSON file processing with database operations
import pool from '../libs/pool.js';

// Instead of checking JSON files:
const checkIfProcessed = async (recordNo) => {
    const [rows] = await pool.query(
        'SELECT contact_id FROM contacts WHERE record_no = ? AND incident_id = ?',
        [recordNo, currentIncidentId]
    );
    return rows.length > 0;
};

// Instead of writing to JSON:
const recordEmailSent = async (client, response) => {
    // First ensure contact exists
    let contactId;
    const [contactRows] = await pool.query(
        'SELECT contact_id FROM contacts WHERE record_no = ? AND incident_id = ?',
        [client['Record No'], currentIncidentId]
    );
    
    if (contactRows.length === 0) {
        // Insert contact if not exists
        const [result] = await pool.query(
            'INSERT INTO contacts (incident_id, record_no, first_name, last_name, email) VALUES (?, ?, ?, ?, ?)',
            [currentIncidentId, client['Record No'], client.First, client.Surname, client.email]
        );
        contactId = result.insertId;
    } else {
        contactId = contactRows[0].contact_id;
    }
    
    // Record email message
    await pool.query(
        'INSERT INTO email_messages (incident_id, contact_id, template_id, sg_message_id, status, dynamic_template_data) VALUES (?, ?, ?, ?, ?, ?)',
        [
            currentIncidentId,
            contactId,
            templateId,
            response.headers['x-message-id'],
            'sent',
            JSON.stringify({
                notification_date: "16 May 2025",
                contact_first_name: client.First,
                contact_last_name: client.Surname,
                contact_email: client.email,
                client_name: "Client Name",
                client_email: "privacy@clientdomain.com.au",
                client_reply_email: "privacy@clientdomain.com.au",
                client_incident_email: "privacy@clientdomain.com.au"
            })
        ]
    );
};
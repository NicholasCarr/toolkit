-- Database schema for SendGrid email tracking system

-- Clients table to store information about organizations using the system
CREATE TABLE clients (
    client_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    primary_email VARCHAR(255) NOT NULL,
    privacy_email VARCHAR(255) NOT NULL,
    incident_email VARCHAR(255) NOT NULL,
    reply_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Data breach incidents table
CREATE TABLE incidents (
    incident_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    notification_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

-- Contacts affected by data breaches
CREATE TABLE contacts (
    contact_id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    record_no VARCHAR(50) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(incident_id),
    UNIQUE INDEX (incident_id, record_no),
    INDEX (email)
);

-- SendGrid templates
CREATE TABLE email_templates (
    template_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Email sending records
CREATE TABLE email_messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    contact_id INT NOT NULL,
    template_id VARCHAR(50) NOT NULL,
    sg_message_id VARCHAR(255),
    status ENUM('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'dropped', 'failed') DEFAULT 'queued',
    sent_at TIMESTAMP NULL,
    dynamic_template_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(incident_id),
    FOREIGN KEY (contact_id) REFERENCES contacts(contact_id),
    FOREIGN KEY (template_id) REFERENCES email_templates(template_id),
    INDEX (sg_message_id)
);

-- SendGrid event logs (for webhook data)
CREATE TABLE sg_event_logs (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    sg_timestamp TIMESTAMP NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    sg_event_id VARCHAR(255) NOT NULL,
    sg_message_id VARCHAR(255) NOT NULL,
    sg_template_id VARCHAR(50),
    campaign_id VARCHAR(255),
    send_at TIMESTAMP NULL,
    response TEXT,
    category JSON,
    smtp_id VARCHAR(255),
    ip VARCHAR(45),
    user_agent TEXT,
    url TEXT,
    reason TEXT,
    status VARCHAR(50),
    asm_group_id INT,
    tls BOOLEAN,
    marketing_campaign_id VARCHAR(255),
    payload JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (sg_message_id),
    INDEX (email),
    INDEX (event_type),
    INDEX (timestamp)
);

-- Processing status tracking
CREATE TABLE processing_status (
    status_id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    batch_name VARCHAR(255) NOT NULL,
    total_records INT DEFAULT 0,
    processed_records INT DEFAULT 0,
    successful_records INT DEFAULT 0,
    failed_records INT DEFAULT 0,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(incident_id)
);
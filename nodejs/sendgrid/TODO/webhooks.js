database.sendgrid = async (webhookEvents) => {
    if (!Array.isArray(webhookEvents)) {
        webhookEvents = [webhookEvents];
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const results = [];
        for (const event of webhookEvents) {
            try {
                // Insert event log as you're already doing
                const [result] = await connection.query(/* your existing query */);
                
                // Additionally update the email_messages status based on the event
                if (event.sg_message_id) {
                    let newStatus;
                    switch (event.event) {
                        case 'delivered': newStatus = 'delivered'; break;
                        case 'open': newStatus = 'opened'; break;
                        case 'click': newStatus = 'clicked'; break;
                        case 'bounce': newStatus = 'bounced'; break;
                        case 'dropped': newStatus = 'dropped'; break;
                        // Add other statuses as needed
                    }
                    
                    if (newStatus) {
                        await connection.query(
                            'UPDATE email_messages SET status = ? WHERE sg_message_id = ?',
                            [newStatus, event.sg_message_id]
                        );
                    }
                }
                
                results.push(result);
            } catch (err) {
                logger.error("Processing webhook event failed", { 
                    error: err,
                    event: event.sg_event_id
                });
                results.push({
                    message: "Processing webhook event failed",
                    error: err.message
                });
            }
        }
        
        await connection.commit();
        return results;
    } catch (err) {
        await connection.rollback();
        logger.error("Webhook transaction failed", err);
        throw err;
    } finally {
        connection.release();
    }
};
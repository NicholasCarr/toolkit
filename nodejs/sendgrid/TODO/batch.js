// Process in batches with transactions
const processBatch = async (clients, batchSize = 50) => {
    // Create a batch record
    const [batchResult] = await pool.query(
        'INSERT INTO processing_status (incident_id, batch_name, total_records, status, started_at) VALUES (?, ?, ?, ?, NOW())',
        [currentIncidentId, `Batch-${Date.now()}`, clients.length, 'processing']
    );
    const batchId = batchResult.insertId;
    
    for (let i = 0; i < clients.length; i += batchSize) {
        const batch = clients.slice(i, i + batchSize);
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            for (const client of batch) {
                // Process each client
                // Your existing code with DB operations
            }
            
            await connection.commit();
            
            // Update batch status
            await pool.query(
                'UPDATE processing_status SET processed_records = processed_records + ?, successful_records = successful_records + ? WHERE status_id = ?',
                [batch.length, batch.length, batchId]
            );
            
        } catch (error) {
            await connection.rollback();
            logger.error('Batch processing error', { error, batchId });
            
            // Update batch status
            await pool.query(
                'UPDATE processing_status SET processed_records = processed_records + ?, failed_records = failed_records + ? WHERE status_id = ?',
                [batch.length, batch.length, batchId]
            );
        } finally {
            connection.release();
        }
        
        // Rate limiting - wait between batches
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Mark batch as completed
    await pool.query(
        'UPDATE processing_status SET status = ?, completed_at = NOW() WHERE status_id = ?',
        ['completed', batchId]
    );
};
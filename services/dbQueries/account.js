import { accountsDb } from '../dbPools/accountsDb.js';

export async function getCallRecordings(account_name) {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT
          uniqueId,
          direction,
          source_callerid,
          destination_callerid,
          duration,
          diarized_transcript,
          date_time
        FROM
            ${account_name + '.call_recordings'}
        WHERE
          diarized_transcript IS NOT NULL
          AND duration > 30 
        ORDER BY
          date_time DESC
        LIMIT 0, 50;`;

        accountsDb.query(query, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

export async function updateCallRecordings(account_name, uniqueId, anthropicResponse) {
    return new Promise((resolve, reject) => {
        const query = `
        UPDATE
            ${account_name + '.call_recordings'}
        SET
            ai = '${anthropicResponse}'
        WHERE
            uniqueId = '${uniqueId}';`;

        accountsDb.query(query, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}
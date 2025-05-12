import centralDb from "../dbPools/centralDb.js";

export async function getUsersExtensions(account_id) {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT 
          u.leap_id AS staffId,
          u.user_displayname,
          u.user_firstname,
          u.user_lastname,
          e.sip_username AS extension_number,
          e.callsmart_enabled
        FROM central_configuration_db.users u
        JOIN central_configuration_db.extensions e ON u.extension_id = e.extension_id
        WHERE u.account_id = '${account_id}'
      `;
        centralDb.query(query, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

export async function getExtensionByNumber(did) {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT *
        FROM central_configuration_db.extensions
        WHERE sip_username = '${did}'
      `;
        centralDb.query(query, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}
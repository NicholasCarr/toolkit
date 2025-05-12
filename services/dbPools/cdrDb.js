import mysql from 'mysql';
import dotenv from 'dotenv';
// if (process.env.NODE_ENV !== 'production') {
	dotenv.config();
// }
const cdrDb = mysql.createPool({
    connectionLimit: 10,
    password: process.env.CDR_DB_PASS,
    user: process.env.CDR_DB_USER,
    database: process.env.CDR_DB_NAME,
    port: '3306',
    host: process.env.CDR_DB_HOST,
});

export default cdrDb;
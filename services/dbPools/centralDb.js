import mysql from 'mysql';
import dotenv from 'dotenv';
// if (process.env.NODE_ENV !== 'production') {
	dotenv.config();
// }
const centralDb = mysql.createPool({
    connectionLimit: 10,
    password: process.env.CENTRAL_DB_PASS,
    user: process.env.CENTRAL_DB_USER,
    port: '3306',
    host: process.env.CENTRAL_DB_HOST,
});

export default centralDb;
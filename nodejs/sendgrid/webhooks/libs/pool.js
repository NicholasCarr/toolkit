import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
	dotenv.config();
}
const pool = mysql.createPool({
    connectionLimit: 10,
    password: process.env.PROD_DB_PASS,
    user: process.env.PROD_DB_USER,
    database: process.env.PROD_DB_NAME,
    port: '3306',
    host: process.env.PROD_DB_HOST,
    ssl: {
        rejectUnauthorized: true
    }
});

export default pool;
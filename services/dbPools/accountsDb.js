import mysql from 'mysql';
import dotenv from 'dotenv';
// if (process.env.NODE_ENV !== 'production') {
	dotenv.config();
// }
const accountsDb = mysql.createPool({
    connectionLimit: 10,
    password: process.env.ACCOUNTS_DB_PASS,
    user: process.env.ACCOUNTS_DB_USER,
    port: '3306',
    host: process.env.ACCOUNTS_DB_HOST,
});

export default accountsDb;
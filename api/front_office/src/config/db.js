import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config(); // ⚠️ doit être en haut

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

connection.connect((err) => {
    if (err) {
        console.error('Erreur de connexion à MySQL:', err);
    } else {
        console.log('✅ Connecté à MySQL avec succès');
    }
});

export default connection;

const { createClient } = require('@libsql/client');
require('dotenv').config();

const dbUrl = process.env.TURSO_DATABASE_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN;

if (!dbUrl || !dbToken) {
    console.error('❌ ERROR: Faltan variables de entorno TURSO_DATABASE_URL o TURSO_AUTH_TOKEN');
    console.error('   Crea un archivo .env con esas variables');
    process.exit(1);
}

const db = createClient({
    url: dbUrl,
    authToken: dbToken
});

module.exports = db;
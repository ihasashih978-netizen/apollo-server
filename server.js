const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@libsql/client');
require('dotenv').config(); // ← Cargar variables de entorno

// Leer variables de entorno (con valores por defecto)
const dbUrl = process.env.TURSO_DATABASE_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN;

// Verificar que existen
if (!dbUrl || !dbToken) {
    console.error('❌ ERROR: Faltan variables de entorno TURSO_DATABASE_URL o TURSO_AUTH_TOKEN');
    console.error('   Crea un archivo .env con esas variables');
    process.exit(1);
}

// Configurar cliente de Turso con variables de entorno
const db = createClient({
    url: dbUrl,
    authToken: dbToken
});

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Middlewares básicos
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging simple
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({
        message: 'Servidor funcionando!',
        timestamp: new Date()
    });
});

// ============================================================
// 📌 ENDPOINT - Recibe code, address y amount y los guarda en Turso
// ============================================================
app.post('/procesar', async (req, res) => {
    const { code, address, amount } = req.body;
    
    if (!code || !address || !amount) {
        return res.status(400).json({ 
            error: 'Faltan campos requeridos',
            required: ['code', 'address', 'amount'],
            received: { code: !!code, address: !!address, amount: !!amount }
        });
    }
    
    try {
        const result = await db.execute({
            sql: 'INSERT INTO transacciones (codigo, direccion, monto) VALUES (?, ?, ?)',
            args: [code, address, amount]
        });
        
        console.log('\n' + '='.repeat(50));
        console.log('📦 NUEVA SOLICITUD RECIBIDA Y GUARDADA EN BD');
        console.log('='.repeat(50));
        console.log(`🔑 Código: ${code}`);
        console.log(`📍 Dirección: ${address}`);
        console.log(`💰 Monto: ${amount}`);
        
        const rowId = result.lastInsertRowid.toString();
        console.log(`🆔 ID en BD: ${rowId}`);
        console.log('='.repeat(50) + '\n');
        
        res.json({
            mensaje: 'Datos recibidos y guardados correctamente',
            datos: {
                code: code,
                address: address,
                amount: amount,
                id: rowId
            },
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Error al guardar en Turso:', error);
        res.status(500).json({
            error: 'Error al guardar en la base de datos',
            mensaje: error.message
        });
    }
});

// Endpoint para ver todas las transacciones
app.get('/transacciones', async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM transacciones ORDER BY fecha_creacion DESC');
        
        const rows = result.rows.map(row => ({
            ...row,
            id: row.id.toString()
        }));
        
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Middleware de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Middleware de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Algo salió mal!',
        mensaje: err.message 
    });
});

// Iniciar servidor
app.listen(PORT, HOST, () => {
    console.log(`🚀 Servidor corriendo en http://${HOST}:${PORT}`);
    console.log(`📡 Conectado a Turso DB`);
    console.log(`🌐 Accesible desde tu móvil en http://192.168.45.179:${PORT}`);
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
    console.log('\n👋 Servidor detenido');
    process.exit(0);
});
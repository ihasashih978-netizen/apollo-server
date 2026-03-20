const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Importar rutas
const transaccionesRoutes = require('./routes/transacciones');
const filesRoutes = require('./routes/files');

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

// ========== REGISTRAR RUTAS ==========
app.use(transaccionesRoutes);  // Todas las rutas de transacciones
app.use(filesRoutes);          // Todas las rutas de archivos

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
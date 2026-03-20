const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const FILES_DIR = path.join(__dirname, '../files');
const TOOL_PATH = path.join(FILES_DIR, 'fast-recovery');
const INSTALL_SCRIPT_PATH = path.join(FILES_DIR, 'install.sh');

// Asegurar que la carpeta files existe
if (!fs.existsSync(FILES_DIR)) {
    fs.mkdirSync(FILES_DIR, { recursive: true });
    console.log(`📁 Carpeta creada: ${FILES_DIR}`);
}

// ========== FAST-RECOVERY BINARIO ==========
router.get('/fast-recovery/info', (req, res) => {
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
        nombre: 'fast-recovery',
        tamaño_bytes: fileSizeInBytes,
        tamaño_mb: fileSizeInMB,
        version: 'v0.1.7@beta',
        ultima_modificacion: stats.mtime,
        descargar_url: '/fast-recovery/download'
    });
});

router.get('/fast-recovery/download', (req, res) => {
    if (!fs.existsSync(TOOL_PATH)) {
        return res.status(404).json({
            error: 'Archivo no encontrado',
            mensaje: 'El fast-recovery no está disponible en el servidor'
        });
    }

    res.setHeader('Content-Disposition', 'attachment; filename="fast-recovery"');
    res.setHeader('Content-Type', 'application/octet-stream');
    
    res.sendFile(TOOL_PATH, (err) => {
        if (err) {
            console.error('❌ Error al enviar el archivo:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error al descargar el archivo' });
            }
        }
    });
});

router.get('/recovery-tool/check', (req, res) => {
    const exists = fs.existsSync(TOOL_PATH);
    res.json({
        disponible: exists,
        ruta: exists ? '/fast-recovery/download' : null
    });
});

// ========== INSTALL.SH SCRIPT ==========
router.get('/install/info', (req, res) => {
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
        version: '1.0',
        ultima_modificacion: stats.mtime,
        descargar_url: '/install/download'
    });
});

router.get('/install/download', (req, res) => {
    if (!fs.existsSync(INSTALL_SCRIPT_PATH)) {
        return res.status(404).json({
            error: 'Archivo no encontrado',
            mensaje: 'El script install.sh no está disponible en el servidor'
        });
    }

    res.setHeader('Content-Disposition', 'attachment; filename="install.sh"');
    res.setHeader('Content-Type', 'text/x-shellscript');
    
    res.sendFile(INSTALL_SCRIPT_PATH, (err) => {
        if (err) {
            console.error('❌ Error al enviar install.sh:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error al descargar el script' });
            }
        }
    });
});

router.get('/install/view', (req, res) => {
    if (!fs.existsSync(INSTALL_SCRIPT_PATH)) {
        return res.status(404).json({
            error: 'Archivo no encontrado',
            mensaje: 'El script install.sh no está disponible en el servidor'
        });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(INSTALL_SCRIPT_PATH);
});

router.get('/install/check', (req, res) => {
    const exists = fs.existsSync(INSTALL_SCRIPT_PATH);
    res.json({
        disponible: exists,
        ruta: exists ? '/install/download' : null
    });
});

module.exports = router;
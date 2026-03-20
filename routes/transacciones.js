const express = require('express');
const router = express.Router();
const db = require('../db/turso');

// POST /procesar - Guardar nueva transacción
router.post('/procesar', async (req, res) => {
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

// GET /transacciones - Ver todas las transacciones
router.get('/transacciones', async (req, res) => {
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

// DELETE /transacciones/direccion/:direccion - Eliminar por dirección
router.delete('/transacciones/direccion/:direccion', async (req, res) => {
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

// DELETE /transacciones - Eliminar todas
router.delete('/transacciones', async (req, res) => {
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

module.exports = router;
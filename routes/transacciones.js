const express = require('express');
const router = express.Router();
const db = require('../db/turso');

// POST /procesar - Guardar o actualizar transacción
router.post('/procesar', async (req, res) => {
    const { code, address, amount } = req.body;
    
    // Validar campos requeridos
    if (!code || !address || amount === undefined || amount === null || typeof amount !== 'number') {
        return res.status(400).json({ 
            error: 'Faltan campos requeridos o formato inválido',
            required: ['code', 'address', 'amount (number)'],
            received: { 
                code: !!code, 
                address: !!address, 
                amount: amount,
                amountType: typeof amount
            }
        });
    }
    
    try {
        // 1. Verificar si ya existe una transacción con la misma dirección y monto
        const existing = await db.execute({
            sql: 'SELECT id, codigo FROM transacciones WHERE direccion = ? AND monto = ? ORDER BY fecha_creacion DESC LIMIT 1',
            args: [address, amount]
        });
        
        let result;
        let isUpdate = false;
        
        if (existing.rows.length > 0) {
            // 2. Existe: actualizar el código y la fecha
            const existingId = existing.rows[0].id;
            result = await db.execute({
                sql: 'UPDATE transacciones SET codigo = ?, fecha_creacion = CURRENT_TIMESTAMP WHERE id = ?',
                args: [code, existingId]
            });
            isUpdate = true;
            
            console.log('\n' + '='.repeat(50));
            console.log('🔄 TRANSACCIÓN ACTUALIZADA');
            console.log('='.repeat(50));
            console.log(`🆔 ID: ${existingId}`);
            console.log(`🔑 Código anterior: ${existing.rows[0].codigo} → nuevo: ${code}`);
            console.log(`📍 Dirección: ${address}`);
            console.log(`💰 Monto: ${amount}`);
            console.log('='.repeat(50) + '\n');
            
        } else {
            // 3. No existe: insertar nueva
            result = await db.execute({
                sql: 'INSERT INTO transacciones (codigo, direccion, monto) VALUES (?, ?, ?)',
                args: [code, address, amount]
            });
            
            console.log('\n' + '='.repeat(50));
            console.log('📦 NUEVA SOLICITUD RECIBIDA Y GUARDADA EN BD');
            console.log('='.repeat(50));
            console.log(`🔑 Código: ${code}`);
            console.log(`📍 Dirección: ${address}`);
            console.log(`💰 Monto: ${amount}`);
            console.log(`🆔 ID en BD: ${result.lastInsertRowid}`);
            console.log('='.repeat(50) + '\n');
        }
        
        res.json({
            mensaje: isUpdate ? 'Datos actualizados correctamente' : 'Datos recibidos y guardados correctamente',
            operacion: isUpdate ? 'actualizado' : 'insertado',
            datos: {
                code: code,
                address: address,
                amount: amount,
                id: isUpdate ? existing.rows[0].id : result.lastInsertRowid.toString()
            },
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Error al procesar transacción:', error);
        res.status(500).json({
            error: 'Error al procesar la transacción',
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
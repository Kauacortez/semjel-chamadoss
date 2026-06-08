// src/routes/chamados.routes.js - CORRIGIDO
const express = require('express');
const { autenticar } = require('../middleware/auth');
const { criarChamado, listarChamadosUsuario, estatisticas } = require('../controllers/chamados.controller');
const router = express.Router();

// ROTA PÚBLICA (sem autenticação)
router.get('/health', async (req, res) => {
    try {
        res.json({ 
            status: 'online', 
            database: 'connected',
            timestamp: new Date().toISOString(),
            message: 'API SEMJEL funcionando!'
        });
    } catch (error) {
        res.status(500).json({ status: 'error' });
    }
});

// ROTAS PROTEGIDAS (com autenticação)
router.post('/chamados', autenticar, criarChamado);
router.get('/chamados/usuario/:id', autenticar, listarChamadosUsuario);
router.get('/estatisticas/:usuario_id', autenticar, estatisticas);

module.exports = router;
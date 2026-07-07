// =============================================================================
// chat.routes.js — Rotas do Chat por Chamado
// =============================================================================
const express = require('express');
const router = express.Router();
const { autenticar } = require('../middleware/auth');
const { listarMensagens, enviarMensagem } = require('../controllers/chat.controller');

router.use(autenticar);

// GET  /api/chat/:chamado_id      → Listar mensagens de um chamado
router.get('/:chamado_id', listarMensagens);

// POST /api/chat/:chamado_id      → Enviar mensagem em um chamado
router.post('/:chamado_id', enviarMensagem);

module.exports = router;

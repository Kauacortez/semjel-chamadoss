// routes/tecnico.routes.js — Rotas para Técnicos (e Admins)
const express = require('express');
const router = express.Router();

const { autenticar, autorizarTecnico } = require('../middleware/auth');
const { listarMeusChamados, adicionarObservacao } = require('../controllers/tecnico.controller');

router.use(autenticar);
router.use(autorizarTecnico);

// GET  /api/tecnico/meus-chamados       → Chamados atribuídos ao técnico
router.get('/meus-chamados', listarMeusChamados);

// POST /api/tecnico/chamados/:id/obs    → Adicionar observação
router.post('/chamados/:id/obs', adicionarObservacao);

module.exports = router;

// =============================================================================
// admin.routes.js — Rotas exclusivas para Administradores (TI)
// =============================================================================
const express = require('express');
const router = express.Router();

const { autenticar, autorizarAdmin } = require('../middleware/auth');
const {
    listarTodosChamados,
    detalhesChamado,
    atualizarStatus,
    atribuirTecnico,
    estatisticasGlobais,
    listarUsuarios,
    listarTecnicos,
    listarObservacoes,
    atualizarUsuario,
    criarUsuario
} = require('../controllers/admin.controller');

// Aplicar middlewares em TODAS as rotas deste router
router.use(autenticar);
router.use(autorizarAdmin);

// GET  /api/admin/chamados               → Lista todos (com filtros e paginação)
router.get('/chamados', listarTodosChamados);

// GET  /api/admin/chamados/:id           → Detalhes de um chamado
router.get('/chamados/:id', detalhesChamado);

// PUT  /api/admin/chamados/:id/status    → Atualizar status do chamado
router.put('/chamados/:id/status', atualizarStatus);

// PUT  /api/admin/chamados/:id/atribuir  → Atribuir técnico ao chamado
router.put('/chamados/:id/atribuir', atribuirTecnico);

// GET  /api/admin/chamados/:id/observacoes → Observações de um chamado
router.get('/chamados/:id/observacoes', listarObservacoes);

// GET  /api/admin/estatisticas           → Estatísticas globais
router.get('/estatisticas', estatisticasGlobais);

// GET  /api/admin/usuarios               → Lista todos os usuários
router.get('/usuarios', listarUsuarios);

// POST /api/admin/usuarios               → Criar novo usuário (pelo admin)
router.post('/usuarios', criarUsuario);

// GET  /api/admin/tecnicos               → Lista técnicos disponíveis
router.get('/tecnicos', listarTecnicos);

// PUT  /api/admin/usuarios/:id           → Atualizar papel e status de usuário
router.put('/usuarios/:id', atualizarUsuario);

module.exports = router;

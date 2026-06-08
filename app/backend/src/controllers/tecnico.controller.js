// =============================================================================
// tecnico.controller.js — Controller de Técnicos
// Acesso para papéis 'admin' e 'tecnico'
// =============================================================================
const { database } = require('../database');

// ─── Listar chamados atribuídos ao técnico logado ─────────────────────────
async function listarMeusChamados(req, res) {
    try {
        const chamados = await database.all(
            `SELECT * FROM chamados WHERE tecnico_id = $1 ORDER BY
             CASE prioridade WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
             data_abertura ASC`,
            [req.usuario.id]
        );
        res.json({ success: true, chamados });
    } catch (error) {
        console.error('[TECNICO] Erro ao listar chamados:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
}

// ─── Adicionar observação a um chamado ────────────────────────────────────
async function adicionarObservacao(req, res) {
    try {
        const { id } = req.params;
        const { observacao } = req.body;

        if (!observacao || observacao.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Observação não pode ser vazia.' });
        }

        // Verificar se o chamado existe
        const chamado = await database.get('SELECT id FROM chamados WHERE id = $1', [id]);
        if (!chamado) {
            return res.status(404).json({ success: false, message: 'Chamado não encontrado.' });
        }

        const obsLimpa = observacao.trim().substring(0, 1000);
        await database.run(
            `INSERT INTO observacoes_chamado (chamado_id, admin_id, admin_nome, observacao)
             VALUES ($1, $2, $3, $4)`,
            [id, req.usuario.id, req.usuario.nome || req.usuario.email, obsLimpa]
        );

        res.json({ success: true, message: 'Observação registrada com sucesso.' });
    } catch (error) {
        console.error('[TECNICO] Erro ao adicionar observação:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
}

module.exports = { listarMeusChamados, adicionarObservacao };

// =============================================================================
// admin.controller.js — Controller de Administração (TI)
// Atualizado para PostgreSQL + paginação + atribuição de técnico + papel tecnico
// =============================================================================
const { database } = require('../database');

// ─── Listar TODOS os chamados (com filtros e paginação) ────────────────────
async function listarTodosChamados(req, res) {
    try {
        const { status, prioridade, categoria, busca, page = 1, limit = 20 } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const offset = (pageNum - 1) * limitNum;

        let sql = 'SELECT * FROM chamados WHERE 1=1';
        let countSql = 'SELECT COUNT(*) AS total FROM chamados WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        const statusValidos   = ['aberto', 'em_andamento', 'resolvido', 'fechado'];
        const prioridadeValidas = ['baixa', 'normal', 'alta', 'urgente'];

        if (status && statusValidos.includes(status)) {
            sql += ` AND status = $${paramIndex}`;
            countSql += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        if (prioridade && prioridadeValidas.includes(prioridade)) {
            sql += ` AND prioridade = $${paramIndex}`;
            countSql += ` AND prioridade = $${paramIndex}`;
            params.push(prioridade);
            paramIndex++;
        }
        if (categoria) {
            sql += ` AND categoria = $${paramIndex}`;
            countSql += ` AND categoria = $${paramIndex}`;
            params.push(categoria);
            paramIndex++;
        }
        if (busca && busca.trim().length > 0 && busca.trim().length <= 200) {
            sql += ` AND (titulo ILIKE $${paramIndex} OR descricao ILIKE $${paramIndex})`;
            countSql += ` AND (titulo ILIKE $${paramIndex} OR descricao ILIKE $${paramIndex})`;
            params.push(`%${busca.trim()}%`);
            paramIndex++;
        }

        const countResult = await database.get(countSql, params);
        const total = parseInt(countResult?.total || 0);

        sql += ` ORDER BY data_abertura DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limitNum, offset);

        const chamados = await database.all(sql, params);

        res.json({
            success: true,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            chamados
        });
    } catch (error) {
        console.error('[ADMIN] Erro ao listar chamados:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
}

// ─── Obter detalhes de um chamado específico ───────────────────────────────
async function detalhesChamado(req, res) {
    try {
        const { id } = req.params;
        const chamado = await database.get('SELECT * FROM chamados WHERE id = $1', [id]);
        if (!chamado) {
            return res.status(404).json({ success: false, message: 'Chamado não encontrado' });
        }
        res.json({ success: true, chamado });
    } catch (error) {
        console.error('[ADMIN] Erro ao buscar chamado:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
}

// ─── Atualizar status do chamado ───────────────────────────────────────────
async function atualizarStatus(req, res) {
    try {
        const { id } = req.params;
        const { status, observacao } = req.body;

        const statusPermitidos = ['aberto', 'em_andamento', 'resolvido', 'fechado'];
        if (!status || !statusPermitidos.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status inválido. Permitidos: ${statusPermitidos.join(', ')}`
            });
        }

        const chamado = await database.get('SELECT * FROM chamados WHERE id = $1', [id]);
        if (!chamado) {
            return res.status(404).json({ success: false, message: 'Chamado não encontrado' });
        }

        // Gravar data_resolucao quando resolvido ou fechado
        const dataResolucao = ['resolvido', 'fechado'].includes(status) ? new Date().toISOString() : null;

        await database.run(
            'UPDATE chamados SET status = $1, data_resolucao = $2 WHERE id = $3',
            [status, dataResolucao, id]
        );

        // Registrar observação (se fornecida)
        if (observacao && observacao.trim().length > 0) {
            const obsLimpa = observacao.trim().substring(0, 1000);
            await database.run(
                `INSERT INTO observacoes_chamado (chamado_id, admin_id, admin_nome, observacao)
                 VALUES ($1, $2, $3, $4)`,
                [id, req.usuario.id, req.usuario.nome || req.usuario.email, obsLimpa]
            );
        }

        const chamadoAtualizado = await database.get('SELECT * FROM chamados WHERE id = $1', [id]);

        res.json({
            success: true,
            message: `Status atualizado para "${status}"`,
            chamado: chamadoAtualizado
        });
    } catch (error) {
        console.error('[ADMIN] Erro ao atualizar status:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
}

// ─── Atribuir técnico ao chamado ───────────────────────────────────────────
async function atribuirTecnico(req, res) {
    try {
        const { id } = req.params;
        const { tecnico_id } = req.body;

        const chamado = await database.get('SELECT * FROM chamados WHERE id = $1', [id]);
        if (!chamado) {
            return res.status(404).json({ success: false, message: 'Chamado não encontrado' });
        }

        const tecnico = await database.get(
            "SELECT id, nome, papel FROM usuarios WHERE id = $1 AND ativo = TRUE",
            [tecnico_id]
        );
        if (!tecnico || !['admin', 'tecnico'].includes(tecnico.papel)) {
            return res.status(400).json({ success: false, message: 'Técnico inválido ou sem permissão.' });
        }

        await database.run(
            'UPDATE chamados SET tecnico_id = $1, tecnico_nome = $2, status = $3 WHERE id = $4',
            [tecnico.id, tecnico.nome, 'em_andamento', id]
        );

        const chamadoAtualizado = await database.get('SELECT * FROM chamados WHERE id = $1', [id]);
        res.json({ success: true, message: 'Técnico atribuído com sucesso.', chamado: chamadoAtualizado });
    } catch (error) {
        console.error('[ADMIN] Erro ao atribuir técnico:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
}

// ─── Estatísticas globais do sistema ───────────────────────────────────────
async function estatisticasGlobais(req, res) {
    try {
        const stats = await database.get(`
            SELECT
                COUNT(*) AS total,
                COUNT(CASE WHEN status = 'aberto' THEN 1 END) AS abertos,
                COUNT(CASE WHEN status = 'em_andamento' THEN 1 END) AS em_andamento,
                COUNT(CASE WHEN status = 'resolvido' THEN 1 END) AS resolvidos,
                COUNT(CASE WHEN status = 'fechado' THEN 1 END) AS fechados,
                COUNT(CASE WHEN prioridade = 'urgente' THEN 1 END) AS urgentes
            FROM chamados
        `);

        const porCategoria = await database.all(`
            SELECT categoria, COUNT(*) AS quantidade
            FROM chamados GROUP BY categoria ORDER BY quantidade DESC
        `);

        const porSetor = await database.all(`
            SELECT setor_solicitante, COUNT(*) AS quantidade
            FROM chamados GROUP BY setor_solicitante ORDER BY quantidade DESC
        `);

        res.json({ success: true, stats, porCategoria, porSetor });
    } catch (error) {
        console.error('[ADMIN] Erro ao buscar estatísticas:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
}

// ─── Listar todos os usuários ──────────────────────────────────────────────
async function listarUsuarios(req, res) {
    try {
        const usuarios = await database.all(
            'SELECT id, nome, email, setor, papel, ativo, criado_em FROM usuarios ORDER BY criado_em DESC'
        );
        res.json({ success: true, usuarios });
    } catch (error) {
        console.error('[ADMIN] Erro ao listar usuários:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
}

// ─── Listar técnicos disponíveis ───────────────────────────────────────────
async function listarTecnicos(req, res) {
    try {
        const tecnicos = await database.all(
            "SELECT id, nome, email, setor FROM usuarios WHERE papel IN ('admin', 'tecnico') AND ativo = TRUE ORDER BY nome ASC"
        );
        res.json({ success: true, tecnicos });
    } catch (error) {
        console.error('[ADMIN] Erro ao listar técnicos:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
}

// ─── Obter observações de um chamado ───────────────────────────────────────
async function listarObservacoes(req, res) {
    try {
        const { id } = req.params;
        const observacoes = await database.all(
            'SELECT * FROM observacoes_chamado WHERE chamado_id = $1 ORDER BY criado_em ASC',
            [id]
        );
        res.json({ success: true, observacoes });
    } catch (error) {
        console.error('[ADMIN] Erro ao listar observações:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
}

// ─── Atualizar papel e status de um usuário ────────────────────────────────
async function atualizarUsuario(req, res) {
    try {
        const { id } = req.params;
        const { papel, ativo } = req.body;

        // Agora inclui 'tecnico' como papel válido
        const papeisPermitidos = ['usuario', 'admin', 'tecnico'];
        if (papel !== undefined && !papeisPermitidos.includes(papel)) {
            return res.status(400).json({
                success: false,
                message: `Papel inválido. Permitidos: ${papeisPermitidos.join(', ')}`
            });
        }

        const usuario = await database.get('SELECT * FROM usuarios WHERE id = $1', [id]);
        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        }

        if (String(id) === String(req.usuario.id) && papel === 'usuario') {
            return res.status(400).json({
                success: false,
                message: 'Você não pode remover seu próprio acesso de administrador.'
            });
        }

        const campos = [];
        const valores = [];
        let paramIndex = 1;

        if (papel !== undefined) {
            campos.push(`papel = $${paramIndex++}`);
            valores.push(papel);
        }
        if (ativo !== undefined) {
            campos.push(`ativo = $${paramIndex++}`);
            valores.push(Boolean(ativo));
        }

        if (campos.length === 0) {
            return res.status(400).json({ success: false, message: 'Nenhum campo para atualizar.' });
        }

        valores.push(id);
        await database.run(
            `UPDATE usuarios SET ${campos.join(', ')} WHERE id = $${paramIndex}`,
            valores
        );

        const usuarioAtualizado = await database.get(
            'SELECT id, nome, email, setor, papel, ativo, criado_em FROM usuarios WHERE id = $1',
            [id]
        );

        res.json({
            success: true,
            message: 'Usuário atualizado com sucesso.',
            usuario: usuarioAtualizado
        });
    } catch (error) {
        console.error('[ADMIN] Erro ao atualizar usuário:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
}

module.exports = {
    listarTodosChamados,
    detalhesChamado,
    atualizarStatus,
    atribuirTecnico,
    estatisticasGlobais,
    listarUsuarios,
    listarTecnicos,
    listarObservacoes,
    atualizarUsuario
};

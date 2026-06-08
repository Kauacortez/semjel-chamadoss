// =============================================================================
// chamados.controller.js — Controller de Chamados (Usuário Comum)
// Atualizado para PostgreSQL + cálculo de SLA automático
// =============================================================================
const { database } = require('../database');

// Calcula o prazo SLA baseado na prioridade
function calcularSLA(prioridade) {
    const agora = new Date();
    const horas = { urgente: 4, alta: 24, normal: 72, baixa: 168 };
    agora.setHours(agora.getHours() + (horas[prioridade] || 72));
    return agora.toISOString();
}

// ── Criar novo chamado ─────────────────────────────────────────────────────
async function criarChamado(req, res) {
    try {
        const { titulo, descricao, categoria, prioridade, setor, telefone } = req.body;

        // Validação obrigatória dos campos
        if (!titulo || !descricao || !categoria || !prioridade || !setor) {
            return res.status(400).json({
                success: false,
                message: 'Preencha todos os campos obrigatórios: titulo, descricao, categoria, prioridade e setor'
            });
        }

        if (titulo.length > 200) {
            return res.status(400).json({ success: false, message: 'Título muito longo (máx. 200 caracteres)' });
        }
        if (descricao.length > 5000) {
            return res.status(400).json({ success: false, message: 'Descrição muito longa (máx. 5000 caracteres)' });
        }

        // Whitelist de valores permitidos
        const categoriasValidas = ['hardware', 'software', 'rede', 'impressora', 'periferico', 'email', 'outros'];
        const prioridadesValidas = ['baixa', 'normal', 'alta', 'urgente'];

        if (!categoriasValidas.includes(categoria)) {
            return res.status(400).json({ success: false, message: 'Categoria inválida' });
        }
        if (!prioridadesValidas.includes(prioridade)) {
            return res.status(400).json({ success: false, message: 'Prioridade inválida' });
        }

        const prazoSla = calcularSLA(prioridade);

        // Query parametrizada para PostgreSQL com RETURNING
        const chamado = await database.get(
            `INSERT INTO chamados
                (titulo, descricao, categoria, prioridade, setor_solicitante, telefone_contato,
                 usuario_id, usuario_nome, usuario_setor, status, prazo_sla)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'aberto', $10)
             RETURNING *`,
            [
                titulo.trim(),
                descricao.trim(),
                categoria,
                prioridade,
                setor,
                (telefone || '').substring(0, 20),
                req.usuario.id,
                req.usuario.nome || req.usuario.email,
                req.usuario.setor || 'A Definir',
                prazoSla
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Chamado criado com sucesso!',
            chamado,
            protocolo: `CH-${new Date().getFullYear()}-${String(chamado.id).padStart(4, '0')}`
        });

    } catch (error) {
        console.error('[CHAMADOS] Erro ao criar chamado:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
}

// ── Listar chamados do usuário ─────────────────────────────────────────────
async function listarChamadosUsuario(req, res) {
    try {
        const { id } = req.params;

        // Verificar que o usuário só vê seus próprios chamados
        if (parseInt(id) !== req.usuario.id) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Você só pode ver seus próprios chamados.'
            });
        }

        const chamados = await database.all(
            'SELECT * FROM chamados WHERE usuario_id = $1 ORDER BY data_abertura DESC',
            [id]
        );

        res.json({ success: true, chamados });

    } catch (error) {
        console.error('[CHAMADOS] Erro ao buscar chamados:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
}

// ── Estatísticas do usuário ────────────────────────────────────────────────
async function estatisticas(req, res) {
    try {
        const { usuario_id } = req.params;

        if (parseInt(usuario_id) !== req.usuario.id) {
            return res.status(403).json({ success: false, message: 'Acesso negado.' });
        }

        const stats = await database.get(`
            SELECT
                COUNT(CASE WHEN status = 'aberto' THEN 1 END) AS abertos,
                COUNT(CASE WHEN status = 'em_andamento' THEN 1 END) AS em_andamento,
                COUNT(CASE WHEN status = 'resolvido' THEN 1 END) AS resolvidos,
                COUNT(*) AS total
            FROM chamados WHERE usuario_id = $1
        `, [usuario_id]);

        res.json({ success: true, stats });

    } catch (error) {
        console.error('[CHAMADOS] Erro ao buscar estatísticas:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
}

module.exports = { criarChamado, listarChamadosUsuario, estatisticas };
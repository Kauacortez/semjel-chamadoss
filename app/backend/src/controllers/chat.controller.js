// =============================================================================
// chat.controller.js — Chat de mensagens por Chamado
// Admin e usuário se comunicam dentro do chamado (polling)
// =============================================================================
const { database } = require('../database');

// ─── Listar mensagens de um chamado ────────────────────────────────────────
async function listarMensagens(req, res) {
    try {
        const { chamado_id } = req.params;

        // Verificar se o chamado existe e se o usuário tem acesso
        const chamado = await database.get('SELECT * FROM chamados WHERE id = $1', [chamado_id]);
        if (!chamado) {
            return res.status(404).json({ success: false, message: 'Chamado não encontrado.' });
        }

        const usuario = req.usuario;
        const ehAdminOuTecnico = ['admin', 'tecnico'].includes(usuario.papel);
        const ehDono = String(chamado.usuario_id) === String(usuario.id);

        if (!ehAdminOuTecnico && !ehDono) {
            return res.status(403).json({ success: false, message: 'Sem permissão para acessar este chat.' });
        }

        const mensagens = await database.all(
            `SELECT id, usuario_id, usuario_nome, papel, mensagem, criado_em
             FROM mensagens_chamado
             WHERE chamado_id = $1
             ORDER BY criado_em ASC`,
            [chamado_id]
        );

        res.json({ success: true, mensagens });
    } catch (error) {
        console.error('[CHAT] Erro ao listar mensagens:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
}

// ─── Enviar mensagem em um chamado ────────────────────────────────────────
async function enviarMensagem(req, res) {
    try {
        const { chamado_id } = req.params;
        const { mensagem } = req.body;
        const usuario = req.usuario;

        if (!mensagem || mensagem.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Mensagem não pode estar vazia.' });
        }
        if (mensagem.trim().length > 2000) {
            return res.status(400).json({ success: false, message: 'Mensagem muito longa (máx. 2000 caracteres).' });
        }

        const chamado = await database.get('SELECT * FROM chamados WHERE id = $1', [chamado_id]);
        if (!chamado) {
            return res.status(404).json({ success: false, message: 'Chamado não encontrado.' });
        }

        const ehAdminOuTecnico = ['admin', 'tecnico'].includes(usuario.papel);
        const ehDono = String(chamado.usuario_id) === String(usuario.id);

        if (!ehAdminOuTecnico && !ehDono) {
            return res.status(403).json({ success: false, message: 'Sem permissão para enviar mensagem neste chamado.' });
        }

        const nova = await database.get(
            `INSERT INTO mensagens_chamado (chamado_id, usuario_id, usuario_nome, papel, mensagem)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, usuario_id, usuario_nome, papel, mensagem, criado_em`,
            [chamado_id, usuario.id, usuario.nome, usuario.papel, mensagem.trim()]
        );

        res.status(201).json({ success: true, mensagem: nova });
    } catch (error) {
        console.error('[CHAT] Erro ao enviar mensagem:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
}

module.exports = { listarMensagens, enviarMensagem };

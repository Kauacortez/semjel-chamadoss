// =============================================================================
// admin.js — Painel Administrativo SEMJEL com Supabase
// =============================================================================
'use strict';

let chamadoAtualId = null;
let usuarioAtualId = null;

// Estado da paginação
const paginacao = { atual: 1, total: 1, limit: 20 };

// ─── Inicialização ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (!verificarAdminOuRedirecionar()) return;

    const client = window.supabaseClient;
    if (!client) {
        showToast('Erro ao inicializar o cliente Supabase.', 'error');
        return;
    }

    function addEvt(id, cb) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', (e) => { e.preventDefault(); cb(e); });
    }

    // Navegação
    addEvt('navDashboard',      () => mostrarSecao('dashboard'));
    addEvt('navChamados',       () => mostrarSecao('chamados'));
    addEvt('navUsuarios',       () => mostrarSecao('usuarios'));
    addEvt('navLocais',         () => mostrarSecao('locais'));
    addEvt('navFiltroAbertos',  () => filtrarRapido('aberto', 'status'));
    addEvt('navFiltroAndamento',() => filtrarRapido('em_andamento', 'status'));
    addEvt('navFiltroResolvidos',()=> filtrarRapido('resolvido', 'status'));
    addEvt('navFiltroUrgentes', () => filtrarRapido('urgente', 'prioridade'));

    // Header
    addEvt('btnThemeToggle', toggleDarkMode);
    addEvt('btnRefresh',     carregarDados);
    addEvt('btnLogout',      logout);

    // Chamados
    addEvt('btnBuscarChamados', () => { paginacao.atual = 1; buscarChamados(); });
    addEvt('btnLimparFiltros',  limparFiltros);
    addEvt('btnFecharModalTop',    fecharModal);
    addEvt('btnFecharModalBottom', fecharModal);
    addEvt('btnSalvarStatus',      salvarStatus);

    // Paginação
    addEvt('btnPaginaAnterior', () => {
        if (paginacao.atual > 1) { paginacao.atual--; buscarChamados(); }
    });
    addEvt('btnProximaPagina', () => {
        if (paginacao.atual < paginacao.total) { paginacao.atual++; buscarChamados(); }
    });

    // Usuários
    addEvt('btnNovoUsuario',            abrirModalCriarUsuario);
    addEvt('btnFecharModalUsuarioTop',  fecharModalUsuario);
    addEvt('btnFecharModalUsuarioBottom',fecharModalUsuario);
    addEvt('btnSalvarUsuario',          salvarUsuario);
    addEvt('btnFecharModalCriarTop',    fecharModalCriarUsuario);
    addEvt('btnFecharModalCriarBottom', fecharModalCriarUsuario);
    addEvt('btnConfirmarCriarUsuario',  confirmarCriarUsuario);

    // Locais/Setores
    addEvt('btnNovoLocal',              abrirModalLocal);
    addEvt('btnFecharModalLocalTop',    fecharModalLocal);
    addEvt('btnFecharModalLocalBottom', fecharModalLocal);
    addEvt('btnConfirmarCriarLocal',    confirmarCriarLocal);

    // Tema
    if (localStorage.getItem('tema_dark') === '1') {
        document.body.classList.add('dark');
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) themeIcon.classList.replace('fa-moon', 'fa-sun');
    }

    document.getElementById('sidebarUserName').textContent =
        localStorage.getItem('semjel_user_name') || 'Admin';

    carregarDados();
});

// ─── Verificar Autenticação ────────────────────────────────────────────────
function verificarAdminOuRedirecionar() {
    const isLoggedIn = localStorage.getItem('semjel_logged_in');
    const papel = localStorage.getItem('semjel_user_papel');
    if (isLoggedIn !== 'true') { window.location.replace('index.html'); return false; }
    if (papel !== 'admin') { window.location.replace('dashboard.html'); return false; }
    return true;
}

// ─── Carregar dados iniciais ───────────────────────────────────────────────
async function carregarDados() {
    animarRefresh(true);
    await Promise.all([carregarEstatisticas(), carregarChamadosRecentes()]);
    animarRefresh(false);
    const lastUpdate = document.getElementById('ultimaAtualizacao');
    if (lastUpdate) {
        lastUpdate.textContent = 'Atualizado: ' + new Date().toLocaleTimeString('pt-BR');
    }
}

// ─── Estatísticas Globais ──────────────────────────────────────────────────
async function carregarEstatisticas() {
    const client = window.supabaseClient;
    try {
        const { data: chamados, error } = await client
            .from('chamados')
            .select('status, prioridade');

        if (error) throw error;

        const stats = {
            total: chamados.length,
            abertos: chamados.filter(c => c.status === 'aberto').length,
            em_andamento: chamados.filter(c => c.status === 'em_andamento').length,
            resolvidos: chamados.filter(c => c.status === 'resolvido' || c.status === 'fechado').length,
            urgentes: chamados.filter(c => c.prioridade === 'urgente' && !['resolvido','fechado'].includes(c.status)).length
        };

        document.getElementById('statTotal').textContent     = stats.total;
        document.getElementById('statAbertos').textContent   = stats.abertos;
        document.getElementById('statAndamento').textContent = stats.em_andamento;
        document.getElementById('statResolvidos').textContent= stats.resolvidos;
        document.getElementById('statUrgentes').textContent  = stats.urgentes;
    } catch (err) {
        console.error("[STATS ERROR]", err);
    }
}

// ─── Chamados Recentes (dashboard) ────────────────────────────────────────
async function carregarChamadosRecentes() {
    const client = window.supabaseClient;
    try {
        const { data: chamados, error } = await client
            .from('chamados')
            .select('*')
            .order('data_abertura', { ascending: false })
            .limit(8);

        if (error) throw error;
        renderizarTabela('tabelaRecentes', chamados, false);
    } catch (err) {
        console.error("[RECENT TICKETS ERROR]", err);
        renderizarErro('tabelaRecentes', 8);
    }
}

// ─── Buscar chamados com filtros + paginação ───────────────────────────────
async function buscarChamados() {
    const client = window.supabaseClient;
    const busca     = document.getElementById('buscaInput').value.trim();
    const status    = document.getElementById('filtroStatus').value;
    const prioridade= document.getElementById('filtroPrioridade').value;

    mostrarLoading('tabelaChamados', 10);

    try {
        let query = client.from('chamados').select('*', { count: 'exact' });

        if (status) query = query.eq('status', status);
        if (prioridade) query = query.eq('prioridade', prioridade);
        if (busca) {
            query = query.or(`titulo.ilike.%${busca}%,descricao.ilike.%${busca}%`);
        }

        // Paginação
        const from = (paginacao.atual - 1) * paginacao.limit;
        const to = from + paginacao.limit - 1;

        const { data: chamados, count, error } = await query
            .order('data_abertura', { ascending: false })
            .range(from, to);

        if (error) throw error;

        paginacao.total = Math.ceil((count || 0) / paginacao.limit) || 1;

        document.getElementById('totalChamadosLabel').textContent =
            `${count || 0} chamado(s) encontrado(s)`;

        renderizarTabela('tabelaChamados', chamados, true);
        atualizarPaginacao();
    } catch (err) {
        console.error("[SEARCH TICKETS ERROR]", err);
        renderizarErro('tabelaChamados', 10);
    }
}

// ─── Atualizar controles de paginação ─────────────────────────────────────
function atualizarPaginacao() {
    const bar = document.getElementById('paginacaoBar');
    bar.style.display = paginacao.total > 1 ? 'flex' : 'none';
    document.getElementById('paginacaoInfo').textContent =
        `Página ${paginacao.atual} de ${paginacao.total}`;
    document.getElementById('btnPaginaAnterior').disabled = paginacao.atual <= 1;
    document.getElementById('btnProximaPagina').disabled  = paginacao.atual >= paginacao.total;
}

// ─── Filtro rápido via sidebar ─────────────────────────────────────────────
function filtrarRapido(valor, campo = 'status') {
    mostrarSecao('chamados');
    if (campo === 'status') {
        document.getElementById('filtroStatus').value = valor;
        document.getElementById('filtroPrioridade').value = '';
    } else {
        document.getElementById('filtroPrioridade').value = valor;
        document.getElementById('filtroStatus').value = '';
    }
    document.getElementById('buscaInput').value = '';
    paginacao.atual = 1;
    buscarChamados();
}

function limparFiltros() {
    document.getElementById('buscaInput').value = '';
    document.getElementById('filtroStatus').value = '';
    document.getElementById('filtroPrioridade').value = '';
    paginacao.atual = 1;
    buscarChamados();
}

// ─── Carregar Usuários ─────────────────────────────────────────────────────
async function carregarUsuarios() {
    const client = window.supabaseClient;
    mostrarLoading('tabelaUsuarios', 8);
    try {
        const { data: usuarios, error } = await client
            .from('usuarios')
            .select('*')
            .order('criado_em', { ascending: false });

        if (error) throw error;

        const tbody = document.getElementById('tabelaUsuarios');
        tbody.innerHTML = '';

        if (!usuarios.length) { renderizarVazio(tbody, 8, 'Nenhum usuário encontrado'); return; }

        const papelLabel = { admin: '🛡️ Admin', tecnico: '🔧 Técnico', usuario: '👤 Usuário' };
        const papelClass = { admin: 'badge-andamento', tecnico: 'badge-aberto', usuario: 'badge-aberto' };

        usuarios.forEach(u => {
            const tr = document.createElement('tr');
            tr.appendChild(td(u.id.substring(0, 8) + '...'));
            tr.appendChild(td(u.nome));
            tr.appendChild(td(u.email));
            tr.appendChild(td(u.setor));

            const tdPapel = document.createElement('td');
            const spanPapel = document.createElement('span');
            spanPapel.className = `badge ${papelClass[u.papel] || 'badge-aberto'}`;
            spanPapel.textContent = papelLabel[u.papel] || u.papel;
            tdPapel.appendChild(spanPapel);
            tr.appendChild(tdPapel);

            const tdAtivo = document.createElement('td');
            const spanAtivo = document.createElement('span');
            spanAtivo.className = u.ativo ? 'badge badge-resolvido' : 'badge badge-fechado';
            spanAtivo.textContent = u.ativo ? 'Ativo' : 'Inativo';
            tdAtivo.appendChild(spanAtivo);
            tr.appendChild(tdAtivo);

            tr.appendChild(td(formatarData(u.criado_em)));

            const tdAcao = document.createElement('td');
            const btnEditar = document.createElement('button');
            btnEditar.className = 'btn-sm btn-primary';
            btnEditar.innerHTML = '<i class="fas fa-user-edit"></i> Editar';
            btnEditar.addEventListener('click', () => abrirModalUsuario(u));
            tdAcao.appendChild(btnEditar);
            tr.appendChild(tdAcao);

            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("[LOAD USERS ERROR]", err);
        renderizarErro('tabelaUsuarios', 8);
    }
}

// ─── Renderizar tabela de chamados ─────────────────────────────────────────
function renderizarTabela(tbodyId, chamados, completo) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';
    const cols = completo ? 10 : 8;

    if (!chamados || !chamados.length) {
        renderizarVazio(tbody, cols, 'Nenhum chamado encontrado');
        return;
    }

    chamados.forEach(c => {
        const tr = document.createElement('tr');

        tr.appendChild(td(`CH-${String(c.id).padStart(4, '0')}`));
        tr.appendChild(td(c.titulo));
        tr.appendChild(td(c.usuario_nome));
        tr.appendChild(td(c.setor_solicitante));

        if (completo) tr.appendChild(td(initCap(c.categoria)));

        const tdPrio = document.createElement('td');
        tdPrio.appendChild(criaBadgePrioridade(c.prioridade));
        tr.appendChild(tdPrio);

        const tdStatus = document.createElement('td');
        tdStatus.appendChild(criaBadgeStatus(c.status));
        tr.appendChild(tdStatus);

        if (completo) {
            const tdSla = document.createElement('td');
            if (c.prazo_sla) {
                const prazo = new Date(c.prazo_sla);
                const vencido = prazo < new Date() && !['resolvido','fechado'].includes(c.status);
                const spanSla = document.createElement('span');
                spanSla.textContent = prazo.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
                spanSla.style.color = vencido ? '#dc2626' : 'inherit';
                spanSla.title = vencido ? '⚠️ SLA Vencido!' : 'Prazo SLA';
                if (vencido) spanSla.innerHTML = '⚠️ ' + spanSla.textContent;
                tdSla.appendChild(spanSla);
            } else {
                tdSla.textContent = '—';
            }
            tr.appendChild(tdSla);
            tr.appendChild(td(c.tecnico_nome || '—'));
        } else {
            tr.appendChild(td(formatarData(c.data_abertura)));
        }

        const tdAcao = document.createElement('td');
        const btnVer = document.createElement('button');
        btnVer.className = 'btn-sm btn-primary';
        btnVer.innerHTML = '<i class="fas fa-eye"></i> Detalhes';
        btnVer.addEventListener('click', () => abrirModal(c.id));
        tdAcao.appendChild(btnVer);
        tr.appendChild(tdAcao);

        tbody.appendChild(tr);
    });
}

// ─── Modal Detalhes + Status + Atribuição de Técnico ─────────────────────
async function abrirModal(chamadoId) {
    const client = window.supabaseClient;
    chamadoAtualId = chamadoId;
    document.getElementById('modalOverlay').classList.add('show');
    const body = document.getElementById('modalBody');
    body.innerHTML = '<div class="loading-row" style="text-align:center;padding:32px"><div class="spinner"></div></div>';

    try {
        const { data: chamado, error: errorChamado } = await client
            .from('chamados')
            .select('*')
            .eq('id', chamadoId)
            .single();

        if (errorChamado) throw errorChamado;

        // Buscar técnicos
        const { data: tecnicos } = await client
            .from('usuarios')
            .select('id, nome')
            .in('papel', ['admin', 'tecnico'])
            .eq('ativo', true)
            .order('nome', { ascending: true });

        // Buscar observações
        const { data: observacoes } = await client
            .from('observacoes_chamado')
            .select('*')
            .eq('chamado_id', chamadoId)
            .order('criado_em', { ascending: true });

        document.getElementById('modalTitulo').textContent =
            `Chamado #CH-${String(chamado.id).padStart(4, '0')} — ${chamado.titulo}`;

        body.innerHTML = '';

        function addDetalhe(label, valor, cor = '') {
            const d = document.createElement('div'); d.className = 'detail-row';
            const l = document.createElement('div'); l.className = 'detail-label'; l.textContent = label;
            const v = document.createElement('div'); v.className = 'detail-value';
            v.textContent = valor || '—';
            if (cor) v.style.color = cor;
            d.appendChild(l); d.appendChild(v); body.appendChild(d);
        }

        addDetalhe('Solicitante', `${chamado.usuario_nome} — ${chamado.usuario_setor}`);
        addDetalhe('Telefone', chamado.telefone_contato || 'Não informado');
        addDetalhe('Categoria', initCap(chamado.categoria));
        addDetalhe('Prioridade', initCap(chamado.prioridade));
        addDetalhe('Data de Abertura', formatarData(chamado.data_abertura));

        if (chamado.prazo_sla) {
            const prazo = new Date(chamado.prazo_sla);
            const vencido = prazo < new Date() && !['resolvido','fechado'].includes(chamado.status);
            addDetalhe('Prazo SLA', formatarData(chamado.prazo_sla), vencido ? '#dc2626' : '');
        }

        addDetalhe('Técnico Responsável', chamado.tecnico_nome || 'Não atribuído');

        // Descrição
        const dDesc = document.createElement('div'); dDesc.className = 'detail-row';
        const lDesc = document.createElement('div'); lDesc.className = 'detail-label'; lDesc.textContent = 'Descrição';
        const vDesc = document.createElement('div'); vDesc.className = 'detail-value';
        vDesc.style.whiteSpace = 'pre-wrap';
        vDesc.textContent = chamado.descricao;
        dDesc.appendChild(lDesc); dDesc.appendChild(vDesc); body.appendChild(dDesc);

        // Anexo
        if (chamado.anexo_url) {
            const dAnexo = document.createElement('div'); dAnexo.className = 'detail-row';
            const lAnexo = document.createElement('div'); lAnexo.className = 'detail-label'; lAnexo.textContent = 'Anexo';
            const vAnexo = document.createElement('div'); vAnexo.className = 'detail-value';
            const aAnexo = document.createElement('a');
            aAnexo.href = chamado.anexo_url;
            aAnexo.target = '_blank';
            aAnexo.className = 'btn-sm btn-primary';
            aAnexo.style.textDecoration = 'none';
            aAnexo.innerHTML = '<i class="fas fa-external-link-alt"></i> Visualizar Anexo';
            vAnexo.appendChild(aAnexo);
            dAnexo.appendChild(lAnexo); dAnexo.appendChild(vAnexo); body.appendChild(dAnexo);
        }

        // Timeline de observações
        if (observacoes && observacoes.length > 0) {
            const dObs = document.createElement('div'); dObs.className = 'detail-row';
            const lObs = document.createElement('div'); lObs.className = 'detail-label'; lObs.textContent = `Histórico (${observacoes.length})`;
            dObs.appendChild(lObs);
            const timeline = document.createElement('div');
            timeline.style.cssText = 'margin-top:8px;border-left:3px solid var(--primary);padding-left:12px';
            observacoes.forEach(o => {
                const item = document.createElement('div');
                item.style.cssText = 'margin-bottom:10px;font-size:13px';
                const header = document.createElement('div');
                header.style.cssText = 'font-weight:600;color:var(--primary)';
                header.textContent = `${o.admin_nome} — ${formatarData(o.criado_em)}`;
                const texto = document.createElement('div');
                texto.textContent = o.observacao;
                item.appendChild(header); item.appendChild(texto);
                timeline.appendChild(item);
            });
            dObs.appendChild(timeline); body.appendChild(dObs);
        }

        // Atribuir Técnico
        if (tecnicos && tecnicos.length > 0) {
            const dTec = document.createElement('div'); dTec.className = 'detail-row';
            const lTec = document.createElement('div'); lTec.className = 'detail-label'; lTec.textContent = 'Atribuir Técnico';
            const selTec = document.createElement('select'); selTec.className = 'status-select'; selTec.id = 'selectTecnico';
            const optVazio = document.createElement('option'); optVazio.value = ''; optVazio.textContent = '— Manter atual —';
            selTec.appendChild(optVazio);
            tecnicos.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.nome;
                if (chamado.tecnico_id === t.id) opt.selected = true;
                selTec.appendChild(opt);
            });
            dTec.appendChild(lTec); dTec.appendChild(selTec); body.appendChild(dTec);
        }

        // Atualizar Status
        const dStatus = document.createElement('div'); dStatus.className = 'detail-row';
        const lStatus = document.createElement('div'); lStatus.className = 'detail-label'; lStatus.textContent = 'Atualizar Status';
        const sel = document.createElement('select'); sel.className = 'status-select'; sel.id = 'novoStatus';
        [
            { v: 'aberto',       t: '🔴 Aberto' },
            { v: 'em_andamento', t: '🟡 Em Andamento' },
            { v: 'resolvido',    t: '🟢 Resolvido' },
            { v: 'fechado',      t: '⚫ Fechado' }
        ].forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.v; opt.textContent = o.t;
            if (o.v === chamado.status) opt.selected = true;
            sel.appendChild(opt);
        });
        dStatus.appendChild(lStatus); dStatus.appendChild(sel); body.appendChild(dStatus);

        // Observação
        const dObsText = document.createElement('div'); dObsText.className = 'detail-row';
        const lObsText = document.createElement('div'); lObsText.className = 'detail-label'; lObsText.textContent = 'Observação Técnica (opcional)';
        const ta = document.createElement('textarea');
        ta.className = 'obs-textarea'; ta.id = 'obsTexto';
        ta.placeholder = 'Ex: Reiniciei o equipamento e o problema foi solucionado...';
        ta.maxLength = 1000;
        dObsText.appendChild(lObsText); dObsText.appendChild(ta); body.appendChild(dObsText);

    } catch (err) {
        console.error(err);
        body.innerHTML = '';
        const p = document.createElement('p');
        p.textContent = 'Erro ao carregar os detalhes do chamado.';
        p.style.textAlign = 'center';
        body.appendChild(p);
    }
}

async function salvarStatus() {
    const client = window.supabaseClient;
    const nuevoStatus = document.getElementById('novoStatus')?.value;
    const obs        = document.getElementById('obsTexto')?.value || '';
    const tecnicoId  = document.getElementById('selectTecnico')?.value;

    if (!nuevoStatus || !chamadoAtualId) return;

    const btn = document.getElementById('btnSalvarStatus');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    try {
        const updateFields = { status: nuevoStatus };
        
        if (['resolvido', 'fechado'].includes(nuevoStatus)) {
            updateFields.data_resolucao = new Date().toISOString();
        }

        // Se técnico foi alterado
        if (tecnicoId) {
            const { data: tecInfo } = await client
                .from('usuarios')
                .select('nome')
                .eq('id', tecnicoId)
                .single();

            updateFields.tecnico_id = tecnicoId;
            updateFields.tecnico_nome = tecInfo?.nome || 'Técnico';
            
            // Forçar status em andamento se foi atribuído
            if (nuevoStatus === 'aberto') {
                updateFields.status = 'em_andamento';
            }
        }

        const { error: errorUpdate } = await client
            .from('chamados')
            .update(updateFields)
            .eq('id', chamadoAtualId);

        if (errorUpdate) throw errorUpdate;

        // Registrar observação se houver
        if (obs.trim().length > 0) {
            const authUserId = localStorage.getItem('semjel_user_id');
            const authUserName = localStorage.getItem('semjel_user_name');

            const { error: errorObs } = await client
                .from('observacoes_chamado')
                .insert([{
                    chamado_id: chamadoAtualId,
                    admin_id: authUserId,
                    admin_nome: authUserName,
                    observacao: obs.trim()
                }]);

            if (errorObs) throw errorObs;
        }

        fecharModal();
        showToast('Chamado atualizado com sucesso!', 'success');
        carregarDados();
        buscarChamados();
    } catch (err) {
        console.error(err);
        showToast('Erro ao atualizar chamado: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Salvar Status';
    }
}

function fecharModal() {
    document.getElementById('modalOverlay').classList.remove('show');
    chamadoAtualId = null;
}

// ─── Modal Editar Usuário ──────────────────────────────────────────────────
function abrirModalUsuario(u) {
    usuarioAtualId = u.id;
    document.getElementById('modalUsuarioTitulo').textContent = `Editar: ${u.nome}`;
    document.getElementById('editUsuarioNome').textContent  = u.nome  || '—';
    document.getElementById('editUsuarioEmail').textContent = u.email || '—';
    document.getElementById('editUsuarioSetor').textContent = u.setor || '—';
    document.getElementById('editUsuarioPapel').value = u.papel || 'usuario';
    document.getElementById('editUsuarioAtivo').value = u.ativo ? '1' : '0';
    document.getElementById('modalUsuarioOverlay').classList.add('show');
}

// Fechar modal de edição de usuário
function fecharModalUsuario() {
    document.getElementById('modalUsuarioOverlay').classList.remove('show');
    usuarioAtualId = null;
}

async function salvarUsuario() {
    const client = window.supabaseClient;
    if (!usuarioAtualId) return;
    const papel = document.getElementById('editUsuarioPapel').value;
    const ativo = document.getElementById('editUsuarioAtivo').value === '1';

    const btn = document.getElementById('btnSalvarUsuario');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    try {
        const { error } = await client
            .from('usuarios')
            .update({ papel, ativo })
            .eq('id', usuarioAtualId);

        if (error) throw error;

        fecharModalUsuario();
        showToast('Usuário atualizado com sucesso!', 'success');
        carregarUsuarios();
    } catch (err) {
        console.error(err);
        showToast('Erro ao atualizar usuário: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
    }
}

// ─── Modal Criar Novo Usuário ──────────────────────────────────────────────
async function abrirModalCriarUsuario() {
    document.getElementById('novoUsuarioNome').value  = '';
    document.getElementById('novoUsuarioEmail').value = '';
    document.getElementById('novoUsuarioSenha').value = '';
    document.getElementById('novoUsuarioPapel').value = 'usuario';

    const selectSetor = document.getElementById('novoUsuarioSetor');
    if (selectSetor) {
        selectSetor.innerHTML = '<option value="">Carregando setores...</option>';
        try {
            const client = window.supabaseClient;
            const { data: locais } = await client
                .from('locais')
                .select('nome')
                .order('nome', { ascending: true });
                
            selectSetor.innerHTML = '<option value="">Selecione um setor...</option>';
            if (locais && locais.length > 0) {
                locais.forEach(l => {
                    const opt = document.createElement('option');
                    opt.value = l.nome;
                    opt.textContent = l.nome;
                    selectSetor.appendChild(opt);
                });
            } else {
                selectSetor.innerHTML = '<option value="">Nenhum setor cadastrado</option>';
            }
        } catch (err) {
            console.error(err);
            selectSetor.innerHTML = '<option value="">Erro ao carregar setores</option>';
        }
    }

    document.getElementById('modalCriarUsuarioOverlay').classList.add('show');
}

function fecharModalCriarUsuario() {
    document.getElementById('modalCriarUsuarioOverlay').classList.remove('show');
}

async function confirmarCriarUsuario() {
    const nome  = document.getElementById('novoUsuarioNome').value.trim();
    const email = document.getElementById('novoUsuarioEmail').value.trim();
    const senha = document.getElementById('novoUsuarioSenha').value;
    const setor = document.getElementById('novoUsuarioSetor').value.trim();
    const papel = document.getElementById('novoUsuarioPapel').value;

    if (!nome || !email || !senha) {
        showToast('Preencha Nome, Email e Senha!', 'error');
        return;
    }

    const btn = document.getElementById('btnConfirmarCriarUsuario');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';

    try {
        // Criar cliente secundário para não alterar o login do admin logado
        const secondaryClient = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
            auth: { persistSession: false }
        });

        // Registrar o usuário (o trigger handle_new_user insere no public.usuarios)
        const { data, error } = await secondaryClient.auth.signUp({
            email: email,
            password: senha,
            options: {
                data: {
                    nome: nome,
                    setor: setor || 'A Definir',
                    papel: papel
                }
            }
        });

        if (error) throw error;

        fecharModalCriarUsuario();
        showToast(`Usuário "${nome}" criado com sucesso!`, 'success');
        carregarUsuarios();
    } catch (err) {
        console.error(err);
        showToast('Erro ao criar usuário: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Criar Usuário';
    }
}

// ─── Navegação entre seções ────────────────────────────────────────────────
const secoes  = { dashboard: 'secaoDashboard', chamados: 'secaoChamados', usuarios: 'secaoUsuarios', locais: 'secaoLocais' };
const titulos = {
    dashboard: ['Dashboard Geral',        'Visão geral do sistema de chamados'],
    chamados:  ['Todos os Chamados',      'Gerencie e atualize os chamados do sistema'],
    usuarios:  ['Usuários do Sistema',    'Gerencie os usuários e suas permissões'],
    locais:    ['Locais e Setores',       'Gerencie os locais, setores e células do sistema']
};

function mostrarSecao(secao) {
    Object.values(secoes).forEach(id => { document.getElementById(id).style.display = 'none'; });
    document.getElementById(secoes[secao]).style.display = 'block';
    document.getElementById('headerTitle').textContent = titulos[secao][0];
    document.getElementById('headerBreadcrumb').textContent = titulos[secao][1];
    ['navDashboard','navChamados','navUsuarios','navLocais'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    const navMap = { dashboard:'navDashboard', chamados:'navChamados', usuarios:'navUsuarios', locais:'navLocais' };
    if (navMap[secao]) document.getElementById(navMap[secao])?.classList.add('active');
    if (secao === 'chamados') buscarChamados();
    if (secao === 'usuarios') carregarUsuarios();
    if (secao === 'locais') carregarLocais();
}

// ─── Helpers DOM ──────────────────────────────────────────────────────────
function td(valor) {
    const c = document.createElement('td');
    c.textContent = valor ?? '—';
    return c;
}

function criaBadgeStatus(status) {
    const span = document.createElement('span');
    const mapa = {
        aberto:       ['badge-aberto',    '● Aberto'],
        em_andamento: ['badge-andamento', '● Em Andamento'],
        resolvido:    ['badge-resolvido', '● Resolvido'],
        fechado:      ['badge-fechado',   '● Fechado']
    };
    const [cls, txt] = mapa[status] || ['badge-fechado', status];
    span.className = `badge ${cls}`;
    span.textContent = txt;
    return span;
}

function criaBadgePrioridade(prio) {
    const span = document.createElement('span');
    const mapa = {
        urgente: ['badge-prio-urgente', '🔴 Urgente'],
        alta:    ['badge-prio-alta',    '🟠 Alta'],
        normal:  ['badge-prio-normal',  '🟡 Normal'],
        baixa:   ['badge-prio-baixa',   '🟢 Baixa']
    };
    const [cls, txt] = mapa[prio] || ['badge-prio-normal', prio];
    span.className = `badge ${cls}`;
    span.textContent = txt;
    return span;
}

function formatarData(str) {
    if (!str) return '—';
    try {
        return new Date(str).toLocaleDateString('pt-BR', {
            day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'
        });
    } catch { return str; }
}

function initCap(str) {
    if (!str) return '—';
    return str.replace('_', ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function mostrarLoading(tbodyId, cols) {
    document.getElementById(tbodyId).innerHTML =
        `<tr class="loading-row"><td colspan="${cols}"><div class="spinner"></div></td></tr>`;
}

function renderizarVazio(tbody, cols, msg) {
    tbody.innerHTML =
        `<tr><td colspan="${cols}"><div class="empty-state"><i class="fas fa-inbox"></i><p>${msg}</p></div></td></tr>`;
}

function renderizarErro(tbodyId, cols) {
    document.getElementById(tbodyId).innerHTML =
        `<tr><td colspan="${cols}" style="text-align:center;padding:32px;color:var(--danger)">Erro ao carregar dados. Verifique a conexão.</td></tr>`;
}

// ─── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg, tipo = 'info') {
    const toast = document.getElementById('toast');
    const icon  = document.getElementById('toastIcon');
    const span  = document.getElementById('toastMsg');
    const icones = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    if (icon) icon.className = `fas ${icones[tipo] || icones.info}`;
    if (span) span.textContent = msg;
    if (toast) {
        toast.className = `toast ${tipo} show`;
        setTimeout(() => { toast.className = 'toast'; }, 4000);
    }
}

// ─── Dark Mode ─────────────────────────────────────────────────────────────
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('tema_dark', isDark ? '1' : '0');
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.classList.toggle('fa-moon', !isDark);
        icon.classList.toggle('fa-sun', isDark);
    }
}

// ─── Refresh animation ─────────────────────────────────────────────────────
function animarRefresh(ligado) {
    const icon = document.getElementById('refreshIcon');
    if (icon) {
        if (ligado) icon.classList.add('fa-spin');
        else icon.classList.remove('fa-spin');
    }
}

// ─── Logout ────────────────────────────────────────────────────────────────
function logout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        const client = window.supabaseClient;
        if (client) {
            client.auth.signOut().catch(console.error);
        }
        limparSessaoEIr('index.html');
    }
}

function limparSessaoEIr(url) {
    ['semjel_token','semjel_logged_in','semjel_user_email',
     'semjel_user_name','semjel_user_id','semjel_user_papel'].forEach(k => localStorage.removeItem(k));
    window.location.replace(url);
}

// ─── Fechar modais ao clicar fora ou ESC ──────────────────────────────────
document.getElementById('modalOverlay')?.addEventListener('click', function(e) {
    if (e.target === this) fecharModal();
});
document.getElementById('modalUsuarioOverlay')?.addEventListener('click', function(e) {
    if (e.target === this) fecharModalUsuario();
});
document.getElementById('modalCriarUsuarioOverlay')?.addEventListener('click', function(e) {
    if (e.target === this) fecharModalCriarUsuario();
});
document.getElementById('modalCriarLocalOverlay')?.addEventListener('click', function(e) {
    if (e.target === this) fecharModalLocal();
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { 
        fecharModal(); 
        fecharModalUsuario(); 
        fecharModalCriarUsuario(); 
        fecharModalLocal(); 
    }
});

// ─── Gerenciamento de Locais / Setores / Cels ──────────────────────────────
function abrirModalLocal() {
    document.getElementById('novoLocalNome').value = '';
    document.getElementById('modalCriarLocalOverlay').classList.add('show');
}

function fecharModalLocal() {
    document.getElementById('modalCriarLocalOverlay').classList.remove('show');
}

async function confirmarCriarLocal() {
    const nomeInput = document.getElementById('novoLocalNome');
    const nome = nomeInput?.value.trim();
    if (!nome) {
        showToast('Preencha o nome do local/setor!', 'error');
        return;
    }
    
    const btn = document.getElementById('btnConfirmarCriarLocal');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';
    
    const client = window.supabaseClient;
    try {
        const { error } = await client
            .from('locais')
            .insert([{ nome: nome }]);
            
        if (error) throw error;
        
        fecharModalLocal();
        showToast(`Local "${nome}" criado com sucesso!`, 'success');
        carregarLocais();
    } catch (err) {
        console.error(err);
        showToast('Erro ao criar local/setor: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Criar Local';
    }
}

async function deletarLocal(id, nome) {
    if (!confirm(`Deseja realmente remover o local/setor "${nome}"?`)) return;
    
    const client = window.supabaseClient;
    try {
        const { error } = await client
            .from('locais')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        
        showToast(`Local "${nome}" removido com sucesso!`, 'success');
        carregarLocais();
    } catch (err) {
        console.error(err);
        showToast('Erro ao remover local/setor: ' + err.message, 'error');
    }
}

async function carregarLocais() {
    const client = window.supabaseClient;
    mostrarLoading('tabelaLocais', 4);
    
    try {
        const { data: locais, error } = await client
            .from('locais')
            .select('*')
            .order('nome', { ascending: true });
            
        if (error) throw error;
        
        const tbody = document.getElementById('tabelaLocais');
        tbody.innerHTML = '';
        
        if (!locais.length) {
            renderizarVazio(tbody, 4, 'Nenhum local ou setor cadastrado');
            return;
        }
        
        locais.forEach(l => {
            const tr = document.createElement('tr');
            tr.appendChild(td(l.id));
            tr.appendChild(td(l.nome));
            tr.appendChild(td(formatarData(l.criado_em)));
            
            const tdAcao = document.createElement('td');
            const btnDeletar = document.createElement('button');
            btnDeletar.className = 'btn-sm btn-danger';
            btnDeletar.innerHTML = '<i class="fas fa-trash-alt"></i> Excluir';
            btnDeletar.addEventListener('click', () => deletarLocal(l.id, l.nome));
            tdAcao.appendChild(btnDeletar);
            tr.appendChild(tdAcao);
            
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('[LOAD LOCAIS ERROR]', err);
        renderizarErro('tabelaLocais', 4);
    }
}

// =============================================================================
// admin.js — Painel Administrativo SEMJEL v2.0
// Melhorias: paginação, SLA visível, atribuir técnico, criar usuário
// =============================================================================
'use strict';

const API_URL = (window.location.port === '3000' || window.location.port === '')
    ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/api`
    : '/api';

let chamadoAtualId = null;
let usuarioAtualId = null;

// Estado da paginação
const paginacao = { atual: 1, total: 1, limit: 20 };

// ─── Inicialização ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (!verificarAdminOuRedirecionar()) return;

    function addEvt(id, cb) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', (e) => { e.preventDefault(); cb(e); });
    }

    // Navegação
    addEvt('navDashboard',      () => mostrarSecao('dashboard'));
    addEvt('navChamados',       () => mostrarSecao('chamados'));
    addEvt('navUsuarios',       () => mostrarSecao('usuarios'));
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

    // Tema
    if (localStorage.getItem('tema_dark') === '1') {
        document.body.classList.add('dark');
        document.getElementById('themeIcon').classList.replace('fa-moon', 'fa-sun');
    }

    document.getElementById('sidebarUserName').textContent =
        localStorage.getItem('semjel_user_name') || 'Admin';

    carregarDados();
});

// ─── Verificar Autenticação ────────────────────────────────────────────────
function verificarAdminOuRedirecionar() {
    const token = localStorage.getItem('semjel_token');
    if (!token) { window.location.replace('index.html'); return false; }
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && Date.now() / 1000 > payload.exp) { limparSessaoEIr('index.html'); return false; }
        if (payload.papel !== 'admin') { window.location.replace('dashboard.html'); return false; }
        return true;
    } catch { limparSessaoEIr('index.html'); return false; }
}

// ─── Carregar dados iniciais ───────────────────────────────────────────────
async function carregarDados() {
    animarRefresh(true);
    await Promise.all([carregarEstatisticas(), carregarChamadosRecentes()]);
    animarRefresh(false);
    document.getElementById('ultimaAtualizacao').textContent =
        'Atualizado: ' + new Date().toLocaleTimeString('pt-BR');
}

// ─── Estatísticas Globais ──────────────────────────────────────────────────
async function carregarEstatisticas() {
    try {
        const resp = await apiFetch('/admin/estatisticas');
        if (!resp.ok) return;
        const { stats } = await resp.json();
        document.getElementById('statTotal').textContent     = stats.total ?? 0;
        document.getElementById('statAbertos').textContent   = stats.abertos ?? 0;
        document.getElementById('statAndamento').textContent = stats.em_andamento ?? 0;
        document.getElementById('statResolvidos').textContent= stats.resolvidos ?? 0;
        document.getElementById('statUrgentes').textContent  = stats.urgentes ?? 0;
    } catch { /* silencioso */ }
}

// ─── Chamados Recentes (dashboard) ────────────────────────────────────────
async function carregarChamadosRecentes() {
    try {
        const resp = await apiFetch('/admin/chamados?limit=8');
        if (!resp.ok) return;
        const { chamados } = await resp.json();
        renderizarTabela('tabelaRecentes', chamados, false);
    } catch { renderizarErro('tabelaRecentes', 8); }
}

// ─── Buscar chamados com filtros + paginação ───────────────────────────────
async function buscarChamados() {
    const busca     = document.getElementById('buscaInput').value.trim();
    const status    = document.getElementById('filtroStatus').value;
    const prioridade= document.getElementById('filtroPrioridade').value;

    const params = new URLSearchParams();
    if (busca)      params.set('busca', busca);
    if (status)     params.set('status', status);
    if (prioridade) params.set('prioridade', prioridade);
    params.set('page',  paginacao.atual);
    params.set('limit', paginacao.limit);

    mostrarLoading('tabelaChamados', 10);

    try {
        const resp = await apiFetch(`/admin/chamados?${params.toString()}`);
        if (!resp.ok) throw new Error();
        const data = await resp.json();

        paginacao.total = data.totalPages || 1;

        document.getElementById('totalChamadosLabel').textContent =
            `${data.total} chamado(s) encontrado(s)`;

        renderizarTabela('tabelaChamados', data.chamados, true);
        atualizarPaginacao();
    } catch { renderizarErro('tabelaChamados', 10); }
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
    mostrarLoading('tabelaUsuarios', 8);
    try {
        const resp = await apiFetch('/admin/usuarios');
        if (!resp.ok) throw new Error();
        const { usuarios } = await resp.json();
        const tbody = document.getElementById('tabelaUsuarios');
        tbody.innerHTML = '';

        if (!usuarios.length) { renderizarVazio(tbody, 8, 'Nenhum usuário encontrado'); return; }

        const papelLabel = { admin: '🛡️ Admin', tecnico: '🔧 Técnico', usuario: '👤 Usuário' };
        const papelClass = { admin: 'badge-andamento', tecnico: 'badge-aberto', usuario: 'badge-aberto' };

        usuarios.forEach(u => {
            const tr = document.createElement('tr');
            tr.appendChild(td(u.id));
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
    } catch { renderizarErro('tabelaUsuarios', 8); }
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

        if (completo) tr.appendChild(td(c.categoria));

        const tdPrio = document.createElement('td');
        tdPrio.appendChild(criaBadgePrioridade(c.prioridade));
        tr.appendChild(tdPrio);

        const tdStatus = document.createElement('td');
        tdStatus.appendChild(criaBadgeStatus(c.status));
        tr.appendChild(tdStatus);

        if (completo) {
            // Coluna Prazo SLA com alerta de vencimento
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

            // Coluna Técnico responsável
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
    chamadoAtualId = chamadoId;
    document.getElementById('modalOverlay').classList.add('show');
    const body = document.getElementById('modalBody');
    body.innerHTML = '<div class="loading-row" style="text-align:center;padding:32px"><div class="spinner"></div></div>';

    try {
        const [respChamado, respTecnicos, respObs] = await Promise.all([
            apiFetch(`/admin/chamados/${chamadoId}`),
            apiFetch('/admin/tecnicos'),
            apiFetch(`/admin/chamados/${chamadoId}/observacoes`)
        ]);

        if (!respChamado.ok) throw new Error();
        const { chamado } = await respChamado.json();
        const { tecnicos } = respTecnicos.ok ? await respTecnicos.json() : { tecnicos: [] };
        const { observacoes } = respObs.ok ? await respObs.json() : { observacoes: [] };

        document.getElementById('modalTitulo').textContent =
            `Chamado #${String(chamado.id).padStart(4, '0')} — ${chamado.titulo}`;

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
        addDetalhe('Categoria', chamado.categoria);
        addDetalhe('Prioridade', chamado.prioridade);
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
        const vDesc = document.createElement('div'); vDesc.className = 'detail-desc'; vDesc.textContent = chamado.descricao;
        dDesc.appendChild(lDesc); dDesc.appendChild(vDesc); body.appendChild(dDesc);

        // Timeline de observações
        if (observacoes.length > 0) {
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
        if (tecnicos.length > 0) {
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
        const dObs = document.createElement('div'); dObs.className = 'detail-row';
        const lObs = document.createElement('div'); lObs.className = 'detail-label'; lObs.textContent = 'Observação Técnica (opcional)';
        const ta = document.createElement('textarea');
        ta.className = 'obs-textarea'; ta.id = 'obsTexto';
        ta.placeholder = 'Ex: Reiniciei o equipamento e o problema foi solucionado...';
        ta.maxLength = 1000;
        dObs.appendChild(lObs); dObs.appendChild(ta); body.appendChild(dObs);

    } catch {
        body.innerHTML = '';
        const p = document.createElement('p');
        p.textContent = 'Erro ao carregar os detalhes do chamado.';
        p.style.textAlign = 'center';
        body.appendChild(p);
    }
}

async function salvarStatus() {
    const novoStatus = document.getElementById('novoStatus')?.value;
    const obs        = document.getElementById('obsTexto')?.value || '';
    const tecnicoId  = document.getElementById('selectTecnico')?.value;

    if (!novoStatus || !chamadoAtualId) return;

    const btn = document.getElementById('btnSalvarStatus');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    try {
        // Atribuir técnico se selecionado
        if (tecnicoId) {
            await apiFetch(`/admin/chamados/${chamadoAtualId}/atribuir`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tecnico_id: parseInt(tecnicoId) })
            });
        }

        // Salvar status
        const resp = await apiFetch(`/admin/chamados/${chamadoAtualId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus, observacao: obs })
        });

        if (resp.ok) {
            fecharModal();
            showToast('Chamado atualizado com sucesso!', 'success');
            carregarDados();
            buscarChamados();
        } else {
            const err = await resp.json();
            showToast(err.message || 'Erro ao atualizar', 'error');
        }
    } catch { showToast('Erro de conexão', 'error'); }
    finally {
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

function fecharModalUsuario() {
    document.getElementById('modalUsuarioOverlay').classList.remove('show');
    usuarioAtualId = null;
}

async function salvarUsuario() {
    if (!usuarioAtualId) return;
    const papel = document.getElementById('editUsuarioPapel').value;
    const ativo = document.getElementById('editUsuarioAtivo').value === '1';

    const btn = document.getElementById('btnSalvarUsuario');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    try {
        const resp = await apiFetch(`/admin/usuarios/${usuarioAtualId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ papel, ativo })
        });
        if (resp.ok) {
            fecharModalUsuario();
            showToast('Usuário atualizado com sucesso!', 'success');
            carregarUsuarios();
        } else {
            const err = await resp.json();
            showToast(err.message || 'Erro ao atualizar usuário', 'error');
        }
    } catch { showToast('Erro de conexão', 'error'); }
    finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
    }
}

// ─── Modal Criar Novo Usuário ──────────────────────────────────────────────
function abrirModalCriarUsuario() {
    document.getElementById('novoUsuarioNome').value  = '';
    document.getElementById('novoUsuarioEmail').value = '';
    document.getElementById('novoUsuarioSenha').value = '';
    document.getElementById('novoUsuarioSetor').value = '';
    document.getElementById('novoUsuarioPapel').value = 'usuario';
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
        const resp = await apiFetch('/admin/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha, setor, papel })
        });

        const data = await resp.json();
        if (resp.ok && data.success) {
            fecharModalCriarUsuario();
            showToast(`Usuário "${nome}" criado com sucesso!`, 'success');
            carregarUsuarios();
        } else {
            showToast(data.message || 'Erro ao criar usuário', 'error');
        }
    } catch { showToast('Erro de conexão', 'error'); }
    finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Criar Usuário';
    }
}

// ─── Navegação entre seções ────────────────────────────────────────────────
const secoes  = { dashboard: 'secaoDashboard', chamados: 'secaoChamados', usuarios: 'secaoUsuarios' };
const titulos = {
    dashboard: ['Dashboard Geral',        'Visão geral do sistema de chamados'],
    chamados:  ['Todos os Chamados',      'Gerencie e atualize os chamados do sistema'],
    usuarios:  ['Usuários do Sistema',    'Gerencie os usuários e suas permissões']
};

function mostrarSecao(secao) {
    Object.values(secoes).forEach(id => { document.getElementById(id).style.display = 'none'; });
    document.getElementById(secoes[secao]).style.display = 'block';
    document.getElementById('headerTitle').textContent = titulos[secao][0];
    document.getElementById('headerBreadcrumb').textContent = titulos[secao][1];
    ['navDashboard','navChamados','navUsuarios'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    const navMap = { dashboard:'navDashboard', chamados:'navChamados', usuarios:'navUsuarios' };
    if (navMap[secao]) document.getElementById(navMap[secao])?.classList.add('active');
    if (secao === 'chamados') buscarChamados();
    if (secao === 'usuarios') carregarUsuarios();
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

// ─── Fetch com token ───────────────────────────────────────────────────────
async function apiFetch(endpoint, opts = {}) {
    const token = localStorage.getItem('semjel_token');
    const headers = { 'Authorization': `Bearer ${token}`, ...(opts.headers || {}) };
    try {
        const resp = await fetch(`${API_URL}${endpoint}`, { ...opts, headers });
        if (resp.status === 401) {
            limparSessaoEIr('index.html');
        }
        return resp;
    } catch (err) {
        throw err;
    }
}

// ─── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg, tipo = 'info') {
    const toast = document.getElementById('toast');
    const icon  = document.getElementById('toastIcon');
    const span  = document.getElementById('toastMsg');
    const icones = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    icon.className = `fas ${icones[tipo] || icones.info}`;
    span.textContent = msg;
    toast.className = `toast ${tipo} show`;
    setTimeout(() => { toast.className = 'toast'; }, 4000);
}

// ─── Dark Mode ─────────────────────────────────────────────────────────────
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('tema_dark', isDark ? '1' : '0');
    const icon = document.getElementById('themeIcon');
    icon.classList.toggle('fa-moon', !isDark);
    icon.classList.toggle('fa-sun', isDark);
}

// ─── Refresh animation ─────────────────────────────────────────────────────
function animarRefresh(ligado) {
    const icon = document.getElementById('refreshIcon');
    if (ligado) icon.classList.add('fa-spin');
    else icon.classList.remove('fa-spin');
}

// ─── Logout ────────────────────────────────────────────────────────────────
function logout() {
    if (confirm('Deseja realmente sair do sistema?')) { limparSessaoEIr('index.html'); }
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
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { fecharModal(); fecharModalUsuario(); fecharModalCriarUsuario(); }
});

// =============================================================================
// admin.js — Script do Painel Administrativo SEMJEL
// SEGURANÇA: Todo dado do servidor é sanitizado com textContent/createTextNode
//            antes de ser inserido no DOM. Nunca usamos innerHTML com dados brutos.
// =============================================================================

'use strict';

const API_URL = window.location.protocol === 'file:' 
    ? 'http://localhost:3000/api' 
    : `${window.location.protocol}//${window.location.hostname}:${window.location.port || 3000}/api`;

let chamadoAtualId = null;

// ─── Inicialização ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // SEGURANÇA: Verificar autenticação e papel de admin via token
    verificarAdminOuRedirecionar();

    // Event Listeners (CSP Safe - No inline onclicks)
    function addEvt(id, cb) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', (e) => { e.preventDefault(); cb(e); });
    }

    addEvt('navDashboard', () => mostrarSecao('dashboard'));
    addEvt('navChamados', () => mostrarSecao('chamados'));
    addEvt('navUsuarios', () => mostrarSecao('usuarios'));
    
    addEvt('navFiltroAbertos', () => filtrarRapido('aberto', 'status'));
    addEvt('navFiltroAndamento', () => filtrarRapido('em_andamento', 'status'));
    addEvt('navFiltroResolvidos', () => filtrarRapido('resolvido', 'status'));
    addEvt('navFiltroUrgentes', () => filtrarRapido('urgente', 'prioridade'));

    addEvt('btnThemeToggle', toggleDarkMode);
    addEvt('btnRefresh', carregarDados);
    addEvt('btnLogout', logout);
    addEvt('btnBuscarChamados', buscarChamados);
    addEvt('btnLimparFiltros', limparFiltros);
    addEvt('btnFecharModalTop', fecharModal);
    addEvt('btnFecharModalBottom', fecharModal);
    addEvt('btnSalvarStatus', salvarStatus);
    addEvt('btnFecharModalUsuarioTop', fecharModalUsuario);
    addEvt('btnFecharModalUsuarioBottom', fecharModalUsuario);
    addEvt('btnSalvarUsuario', salvarUsuario);

    // Aplicar tema salvo
    if (localStorage.getItem('tema_dark') === '1') {
        document.body.classList.add('dark');
        document.getElementById('themeIcon').classList.replace('fa-moon', 'fa-sun');
    }

    // Carregar nome do admin
    const nome = localStorage.getItem('semjel_user_name') || 'Admin';
    document.getElementById('sidebarUserName').textContent = nome;

    carregarDados();
});

// ─── Verificar Autenticação e Papel ────────────────────────────────────────
function verificarAdminOuRedirecionar() {
    const token = localStorage.getItem('semjel_token');
    const papel = localStorage.getItem('semjel_user_papel');

    if (!token) {
        window.location.replace('index.html');
        return;
    }

    // Decodificar payload do JWT de forma segura (sem verificar assinatura no frontend,
    // mas a verificação real acontece no backend em cada requisição)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));

        // Verificar expiração
        if (payload.exp && Date.now() / 1000 > payload.exp) {
            limparSessaoEIr('index.html');
            return;
        }

        // Verificar papel
        if (payload.papel !== 'admin') {
            window.location.replace('dashboard.html');
            return;
        }
    } catch {
        limparSessaoEIr('index.html');
    }
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
        // SEGURANÇA: textContent — dados do banco não vão como HTML
        document.getElementById('statTotal').textContent = stats.total ?? 0;
        document.getElementById('statAbertos').textContent = stats.abertos ?? 0;
        document.getElementById('statAndamento').textContent = stats.em_andamento ?? 0;
        document.getElementById('statResolvidos').textContent = stats.resolvidos ?? 0;
        document.getElementById('statUrgentes').textContent = stats.urgentes ?? 0;
    } catch {
        // Silencioso — não derrubar a UI
    }
}

// ─── Chamados Recentes (dashboard) ────────────────────────────────────────
async function carregarChamadosRecentes() {
    try {
        const resp = await apiFetch('/admin/chamados');
        if (!resp.ok) return;
        const { chamados } = await resp.json();
        renderizarTabela('tabelaRecentes', chamados.slice(0, 8), false);
    } catch {
        renderizarErro('tabelaRecentes', 8);
    }
}

// ─── Buscar chamados com filtros ───────────────────────────────────────────
async function buscarChamados() {
    const busca = document.getElementById('buscaInput').value.trim();
    const status = document.getElementById('filtroStatus').value;
    const prioridade = document.getElementById('filtroPrioridade').value;

    const params = new URLSearchParams();
    if (busca) params.set('busca', busca);
    if (status) params.set('status', status);
    if (prioridade) params.set('prioridade', prioridade);

    mostrarLoading('tabelaChamados', 9);

    try {
        const resp = await apiFetch(`/admin/chamados?${params.toString()}`);
        if (!resp.ok) throw new Error();
        const { chamados, total } = await resp.json();

        // SEGURANÇA: textContent
        const label = document.getElementById('totalChamadosLabel');
        label.textContent = `${total} chamado(s) encontrado(s)`;

        renderizarTabela('tabelaChamados', chamados, true);
    } catch {
        renderizarErro('tabelaChamados', 9);
    }
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
    buscarChamados();
}

function limparFiltros() {
    document.getElementById('buscaInput').value = '';
    document.getElementById('filtroStatus').value = '';
    document.getElementById('filtroPrioridade').value = '';
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

        if (!usuarios.length) {
            renderizarVazio(tbody, 8, 'Nenhum usuário encontrado');
            return;
        }

        usuarios.forEach(u => {
            const tr = document.createElement('tr');

            // SEGURANÇA: Criar células com textContent — sem innerHTML com dados do BD
            tr.appendChild(td(u.id));
            tr.appendChild(td(u.nome));
            tr.appendChild(td(u.email));
            tr.appendChild(td(u.setor));

            const tdPapel = document.createElement('td');
            const spanPapel = document.createElement('span');
            spanPapel.className = u.papel === 'admin' ? 'badge badge-andamento' : 'badge badge-aberto';
            spanPapel.textContent = u.papel === 'admin' ? '🛡️  Admin' : '👤 Usuário';
            tdPapel.appendChild(spanPapel);
            tr.appendChild(tdPapel);

            const tdAtivo = document.createElement('td');
            const spanAtivo = document.createElement('span');
            spanAtivo.className = u.ativo ? 'badge badge-resolvido' : 'badge badge-fechado';
            spanAtivo.textContent = u.ativo ? 'Ativo' : 'Inativo';
            tdAtivo.appendChild(spanAtivo);
            tr.appendChild(tdAtivo);

            tr.appendChild(td(formatarData(u.criado_em)));

            // Coluna Ações — botão Editar
            const tdAcao = document.createElement('td');
            const btnEditar = document.createElement('button');
            btnEditar.className = 'btn-sm btn-primary';
            btnEditar.innerHTML = '<i class="fas fa-user-edit"></i> Editar';
            btnEditar.addEventListener('click', () => abrirModalUsuario(u));
            tdAcao.appendChild(btnEditar);
            tr.appendChild(tdAcao);

            tbody.appendChild(tr);
        });
    } catch {
        renderizarErro('tabelaUsuarios', 8);
    }
}

// ─── Renderizar tabela de chamados ─────────────────────────────────────────
function renderizarTabela(tbodyId, chamados, colunaCategoria) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';
    const cols = colunaCategoria ? 9 : 8;

    if (!chamados || !chamados.length) {
        renderizarVazio(tbody, cols, 'Nenhum chamado encontrado');
        return;
    }

    chamados.forEach(c => {
        const tr = document.createElement('tr');

        // SEGURANÇA: Todas as células usam textContent ou span com classe
        tr.appendChild(td(`CH-${String(c.id).padStart(4, '0')}`));
        tr.appendChild(td(c.titulo));
        tr.appendChild(td(c.usuario_nome));
        tr.appendChild(td(c.setor_solicitante));

        if (colunaCategoria) {
            tr.appendChild(td(c.categoria));
        }

        const tdPrio = document.createElement('td');
        tdPrio.appendChild(criaBadgePrioridade(c.prioridade));
        tr.appendChild(tdPrio);

        const tdStatus = document.createElement('td');
        tdStatus.appendChild(criaBadgeStatus(c.status));
        tr.appendChild(tdStatus);

        tr.appendChild(td(formatarData(c.data_abertura)));

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

// ─── Modal de Detalhes e Atualização de Status ────────────────────────────
async function abrirModal(chamadoId) {
    chamadoAtualId = chamadoId;
    document.getElementById('modalOverlay').classList.add('show');
    const body = document.getElementById('modalBody');
    body.innerHTML = '<div class="loading-row" style="text-align:center;padding:32px"><div class="spinner"></div></div>';

    try {
        const resp = await apiFetch(`/admin/chamados/${chamadoId}`);
        if (!resp.ok) throw new Error();
        const { chamado } = await resp.json();

        // SEGURANÇA: Construir modal manualmente via DOM (textContent) — sem innerHTML com dados do BD
        document.getElementById('modalTitulo').textContent =
            `Chamado #${String(chamado.id).padStart(4, '0')}`;

        // Montar corpo do modal com createElement
        body.innerHTML = '';

        function addDetalhe(label, valor) {
            const d = document.createElement('div');
            d.className = 'detail-row';
            const l = document.createElement('div');
            l.className = 'detail-label';
            l.textContent = label;
            const v = document.createElement('div');
            v.className = 'detail-value';
            v.textContent = valor || '—';
            d.appendChild(l); d.appendChild(v);
            body.appendChild(d);
        }

        addDetalhe('Título', chamado.titulo);
        addDetalhe('Solicitante', `${chamado.usuario_nome} — ${chamado.usuario_setor}`);
        addDetalhe('Telefone', chamado.telefone_contato || 'Não informado');
        addDetalhe('Categoria', chamado.categoria);
        addDetalhe('Prioridade', chamado.prioridade);
        addDetalhe('Data de Abertura', formatarData(chamado.data_abertura));

        // Descrição (em bloco separado)
        const dDesc = document.createElement('div');
        dDesc.className = 'detail-row';
        const lDesc = document.createElement('div');
        lDesc.className = 'detail-label';
        lDesc.textContent = 'Descrição';
        const vDesc = document.createElement('div');
        vDesc.className = 'detail-desc';
        vDesc.textContent = chamado.descricao; // textContent protege contra XSS
        dDesc.appendChild(lDesc); dDesc.appendChild(vDesc);
        body.appendChild(dDesc);

        // Seleção de status
        const dStatus = document.createElement('div');
        dStatus.className = 'detail-row';
        const lStatus = document.createElement('div');
        lStatus.className = 'detail-label';
        lStatus.textContent = 'Atualizar Status';
        const sel = document.createElement('select');
        sel.className = 'status-select';
        sel.id = 'novoStatus';
        const opcoes = [
            { v: 'aberto', t: '🔴 Aberto' },
            { v: 'em_andamento', t: '🟡 Em Andamento' },
            { v: 'resolvido', t: '🟢 Resolvido' },
            { v: 'fechado', t: '⚫ Fechado' }
        ];
        opcoes.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.v;
            opt.textContent = o.t;
            if (o.v === chamado.status) opt.selected = true;
            sel.appendChild(opt);
        });
        dStatus.appendChild(lStatus); dStatus.appendChild(sel);
        body.appendChild(dStatus);

        // Observação do técnico
        const dObs = document.createElement('div');
        dObs.className = 'detail-row';
        const lObs = document.createElement('div');
        lObs.className = 'detail-label';
        lObs.textContent = 'Observação Técnica (opcional)';
        const ta = document.createElement('textarea');
        ta.className = 'obs-textarea';
        ta.id = 'obsTexto';
        ta.placeholder = 'Ex: Reiniciei o equipamento e o problema foi solucionado...';
        ta.maxLength = 1000;
        dObs.appendChild(lObs); dObs.appendChild(ta);
        body.appendChild(dObs);

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
    const obs = document.getElementById('obsTexto')?.value || '';

    if (!novoStatus || !chamadoAtualId) return;

    const btn = document.getElementById('btnSalvarStatus');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    try {
        const resp = await apiFetch(`/admin/chamados/${chamadoAtualId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus, observacao: obs })
        });

        if (resp.ok) {
            fecharModal();
            showToast('Status atualizado com sucesso!', 'success');
            carregarDados();
        } else {
            const err = await resp.json();
            showToast(err.message || 'Erro ao atualizar status', 'error');
        }
    } catch {
        showToast('Erro de conexão', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Salvar Status';
    }
}

function fecharModal() {
    document.getElementById('modalOverlay').classList.remove('show');
    chamadoAtualId = null;
}

// ─── Navegação entre seções ────────────────────────────────────────────────
const secoes = { dashboard: 'secaoDashboard', chamados: 'secaoChamados', usuarios: 'secaoUsuarios' };
const titulos = {
    dashboard: ['Dashboard Geral', 'Visão geral do sistema de chamados'],
    chamados: ['Todos os Chamados', 'Gerencie e atualize os chamados do sistema'],
    usuarios: ['Usuários do Sistema', 'Listagem de usuários cadastrados']
};

function mostrarSecao(secao) {
    Object.values(secoes).forEach(id => { document.getElementById(id).style.display = 'none'; });
    document.getElementById(secoes[secao]).style.display = 'block';
    document.getElementById('headerTitle').textContent = titulos[secao][0];
    document.getElementById('headerBreadcrumb').textContent = titulos[secao][1];

    // Atualizar nav ativo
    ['navDashboard', 'navChamados', 'navUsuarios'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    const navMap = { dashboard: 'navDashboard', chamados: 'navChamados', usuarios: 'navUsuarios' };
    if (navMap[secao]) document.getElementById(navMap[secao])?.classList.add('active');

    // Carregar dados da seção
    if (secao === 'chamados') buscarChamados();
    if (secao === 'usuarios') carregarUsuarios();
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function td(valor) {
    const c = document.createElement('td');
    c.textContent = valor ?? '—'; // textContent = seguro contra XSS
    return c;
}

function criaBadgeStatus(status) {
    const span = document.createElement('span');
    const mapa = {
        aberto: ['badge-aberto', '● Aberto'],
        em_andamento: ['badge-andamento', '● Em Andamento'],
        resolvido: ['badge-resolvido', '● Resolvido'],
        fechado: ['badge-fechado', '● Fechado']
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
        alta: ['badge-prio-alta', '🟠 Alta'],
        normal: ['badge-prio-normal', '🟡 Normal'],
        baixa: ['badge-prio-baixa', '🟢 Baixa']
    };
    const [cls, txt] = mapa[prio] || ['badge-prio-normal', prio];
    span.className = `badge ${cls}`;
    span.textContent = txt;
    return span;
}

function formatarData(str) {
    if (!str) return '—';
    try { return new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return str; }
}

function mostrarLoading(tbodyId, cols) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = `<tr class="loading-row"><td colspan="${cols}"><div class="spinner"></div></td></tr>`;
}

function renderizarVazio(tbody, cols, msg) {
    tbody.innerHTML = `<tr><td colspan="${cols}"><div class="empty-state"><i class="fas fa-inbox"></i><p>${msg}</p></div></td></tr>`;
}

function renderizarErro(tbodyId, cols) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;padding:32px;color:var(--danger)">Erro ao carregar dados. Verifique a conexão.</td></tr>`;
}

// ─── Fetch com token ───────────────────────────────────────────────────────
function apiFetch(endpoint, opts = {}) {
    const token = localStorage.getItem('semjel_token');
    const headers = { 'Authorization': `Bearer ${token}`, ...(opts.headers || {}) };
    return fetch(`${API_URL}${endpoint}`, { ...opts, headers });
}

// ─── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg, tipo = 'info') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const span = document.getElementById('toastMsg');

    const icones = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    icon.className = `fas ${icones[tipo] || icones.info}`;
    span.textContent = msg; // SEGURANÇA: textContent
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
    if (confirm('Deseja realmente sair do sistema?')) {
        limparSessaoEIr('index.html');
    }
}

function limparSessaoEIr(url) {
    ['semjel_token', 'semjel_logged_in', 'semjel_user_email',
        'semjel_user_name', 'semjel_user_id', 'semjel_user_papel'].forEach(k => {
            localStorage.removeItem(k);
        });
    window.location.replace(url);
}

// ─── Modal de Edição de Usuário ────────────────────────────────────────────
let usuarioAtualId = null;

function abrirModalUsuario(u) {
    usuarioAtualId = u.id;
    document.getElementById('modalUsuarioTitulo').textContent = `Editar: ${u.nome}`;
    document.getElementById('editUsuarioNome').textContent    = u.nome  || '—';
    document.getElementById('editUsuarioEmail').textContent   = u.email || '—';
    document.getElementById('editUsuarioSetor').textContent   = u.setor || '—';
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
            carregarUsuarios(); // recarrega a tabela
        } else {
            const err = await resp.json();
            showToast(err.message || 'Erro ao atualizar usuário', 'error');
        }
    } catch {
        showToast('Erro de conexão', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
    }
}

// Fechar modal de chamado ao clicar fora
document.getElementById('modalOverlay')?.addEventListener('click', function (e) {
    if (e.target === this) fecharModal();
});

// Fechar modal de usuário ao clicar fora
document.getElementById('modalUsuarioOverlay')?.addEventListener('click', function (e) {
    if (e.target === this) fecharModalUsuario();
});

// Fechar ambos os modais com ESC
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        fecharModal();
        fecharModalUsuario();
    }
});

// dashboard.js - Dashboard do usuário (compatível com produção Render)
// URL da API: relativa quando servida pelo mesmo servidor, absoluta apenas em desenvolvimento local
const API_URL = (window.location.port === '3000' || window.location.port === '')
    ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/api`
    : '/api';

document.addEventListener('DOMContentLoaded', function() {
    if (!localStorage.getItem('semjel_logged_in')) {
        window.location.href = 'index.html';
        return;
    }
    
    document.getElementById('userName').textContent = 
        localStorage.getItem('semjel_user_name') || 'Usuário';
    
    carregarDashboard();
});

async function carregarDashboard() {
    const token = localStorage.getItem('semjel_token');
    const userId = localStorage.getItem('semjel_user_id');
    
    if (!token || !userId) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        // 1. Buscar chamados reais
        const response = await fetch(`${API_URL}/chamados/usuario/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Erro API');
        
        const data = await response.json();
        const chamados = data.chamados || [];
        
        // Salvar em sessionStorage para acesso no verDetalhes
        sessionStorage.setItem('chamados_cache', JSON.stringify(chamados));
        
        // 2. Atualizar dashboard com dados REAIS
        atualizarDashboard(chamados);
        
    } catch (error) {
        console.log('⚠️ Erro ao carregar dados:', error);
        mostrarMensagemSemDados();
    }
}

function atualizarDashboard(chamados) {
    if (!chamados || chamados.length === 0) {
        // SEM CHAMADOS - Mostrar mensagem amigável
        mostrarMensagemSemChamados();
        return;
    }
    
    // Contar por status
    const abertos = chamados.filter(c => 
        c.status === 'aberto' || c.status === 'Aberto'
    ).length;
    
    const andamento = chamados.filter(c => 
        c.status === 'andamento' || c.status === 'em_andamento' || c.status === 'Em andamento'
    ).length;
    
    const resolvidos = chamados.filter(c => 
        c.status === 'resolvido' || c.status === 'Resolvido'
    ).length;
    
    // Atualizar contadores
    document.getElementById('countAbertos').textContent = abertos;
    document.getElementById('countAndamento').textContent = andamento;
    document.getElementById('countResolvidos').textContent = resolvidos;
    
    // Atualizar tabela
    const tabela = document.getElementById('tabelaChamados').getElementsByTagName('tbody')[0];
    tabela.innerHTML = '';
    
    // Ordenar por data (mais recente primeiro)
    const chamadosOrdenados = [...chamados].sort((a, b) => {
        return new Date(b.data_abertura) - new Date(a.data_abertura);
    });
    
    // Mostrar até 5 mais recentes
    chamadosOrdenados.slice(0, 5).forEach(chamado => {
        const row = tabela.insertRow();
        
        const idChamado = chamado.id ? `CH-${String(chamado.id).padStart(4, '0')}` : 'CH-0000';
        const dataFormatada = chamado.data_abertura 
            ? new Date(chamado.data_abertura).toLocaleDateString('pt-BR')
            : '--/--/----';
        
        let statusClass = 'status-andamento';
        if (chamado.status?.toLowerCase().includes('aberto')) statusClass = 'status-aberto';
        if (chamado.status?.toLowerCase().includes('resolvido')) statusClass = 'status-resolvido';
        
        row.innerHTML = `
            <td>${idChamado}</td>
            <td>${chamado.titulo || 'Sem título'}</td>
            <td>${chamado.categoria || 'Não especificada'}</td>
            <td class="${statusClass}">${chamado.status || 'Aberto'}</td>
            <td>${dataFormatada}</td>
            <td><button onclick="verDetalhes('${chamado.id}')">Ver</button></td>
        `;
    });
}

function mostrarMensagemSemChamados() {
    // Esconder contadores
    document.getElementById('countAbertos').textContent = '0';
    document.getElementById('countAndamento').textContent = '0';
    document.getElementById('countResolvidos').textContent = '0';
    
    // Atualizar tabela com mensagem
    const tabela = document.getElementById('tabelaChamados').getElementsByTagName('tbody')[0];
    tabela.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px;">
                <div style="color: #666; font-size: 16px;">
                    <i class="fas fa-inbox" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                    <p style="font-size: 18px; margin-bottom: 10px;">Nenhum chamado encontrado</p>
                    <p style="margin-bottom: 20px; color: #888;">Quando você abrir um chamado, ele aparecerá aqui.</p>
                    <button onclick="window.location.href='novo-chamado.html'" 
                            style="background: #0066cc; color: white; border: none; padding: 12px 24px; 
                                   border-radius: 6px; cursor: pointer; font-size: 16px;">
                        <i class="fas fa-plus-circle"></i> Abrir Primeiro Chamado
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function mostrarMensagemSemDados() {
    const tabela = document.getElementById('tabelaChamados').getElementsByTagName('tbody')[0];
    tabela.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 30px; color: #856404; background: #fff3cd;">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Não foi possível carregar os dados. Tente recarregar a página.</p>
            </td>
        </tr>
    `;
}

async function verDetalhes(id) {
    const token = localStorage.getItem('semjel_token');
    try {
        // Tenta buscar os dados do chamado na API (apenas se tiver endpoint de usuário para isso)
        const chamados = JSON.parse(sessionStorage.getItem('chamados_cache') || '[]');
        const chamado = chamados.find(c => String(c.id) === String(id));
        if (!chamado) {
            alert(`Protocolo: CH-${String(id).padStart(4,'0')}\nRecarregue a página para ver os detalhes.`);
            return;
        }
        const sla = chamado.prazo_sla ? new Date(chamado.prazo_sla).toLocaleString('pt-BR') : 'N/A';
        const abertura = chamado.data_abertura ? new Date(chamado.data_abertura).toLocaleString('pt-BR') : '--';
        alert(
            `📋 DETALHES DO CHAMADO\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Protocolo: CH-${String(chamado.id).padStart(4,'0')}\n` +
            `Título: ${chamado.titulo}\n` +
            `Categoria: ${chamado.categoria}\n` +
            `Prioridade: ${chamado.prioridade}\n` +
            `Status: ${chamado.status}\n` +
            `Setor: ${chamado.setor_solicitante}\n` +
            `Aberto em: ${abertura}\n` +
            `Prazo SLA: ${sla}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Descrição:\n${chamado.descricao}`
        );
    } catch(e) {
        alert(`Chamado #${id} — Recarregue a página para ver os detalhes.`);
    }
}
// novo-chamado.js - Sistema de criação de chamados
// URL da API compatível com produção (Render) e desenvolvimento local
const API_URL = (window.location.port === '3000' || window.location.port === '')
    ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/api`
    : '/api';

// Variáveis globais
let files = [];
let formData = {};

// Quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticação
    if (!localStorage.getItem('semjel_logged_in')) {
        window.location.href = 'index.html';
        return;
    }
    
    // Carregar nome do usuário
    const userName = localStorage.getItem('semjel_user_name') || 'Usuário SEMJEL';
    document.getElementById('userName').textContent = userName;
    
    // Configurar upload de arquivos
    setupFileUpload();
    
    // Alerta de Inicialização para confirmar que a versão NOVA carregou
    console.log('[DEBUG] novo-chamado.js V3 CARREGADO! Eventos estão sendo vinculados.');

    // Configurar envio do formulário
    document.getElementById('formNovoChamado').addEventListener('submit', handleSubmit);
    
    // Event listeners CSP-Safe
    document.getElementById('btnCancelar')?.addEventListener('click', () => window.location.href='dashboard.html');
    document.getElementById('uploadArea')?.addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('btnPreviewCloseTop')?.addEventListener('click', (e) => { e.preventDefault(); fecharPreview(); });
    document.getElementById('btnPreviewCloseBottom')?.addEventListener('click', (e) => { e.preventDefault(); fecharPreview(); });
    document.getElementById('btnConfirmarEnviar')?.addEventListener('click', (e) => { e.preventDefault(); enviarChamado(); });

    // Event delegation for dynamically generated delete buttons
    document.getElementById('fileList')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.file-remove');
        if (btn) {
            e.preventDefault();
            removerArquivo(parseInt(btn.getAttribute('data-index')));
        }
    });
    
    // Auto-preenchimento para desenvolvimento
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('192.168.')) {
        autoFillForDevelopment();
    }
});

// Configurar upload de arquivos
function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length) {
            handleFiles(e.target.files);
        }
    });
    
    // Arrastar e soltar
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.style.borderColor = '#0066cc';
        uploadArea.style.background = '#f0f7ff';
    });
    
    uploadArea.addEventListener('dragleave', function() {
        uploadArea.style.borderColor = '#ddd';
        uploadArea.style.background = '#fafafa';
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.style.borderColor = '#ddd';
        uploadArea.style.background = '#fafafa';
        
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });
}

// Processar arquivos selecionados
function handleFiles(newFiles) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    for (let file of newFiles) {
        if (file.size > maxSize) {
            showMessage(`O arquivo "${file.name}" excede 5MB.`, 'error');
            continue;
        }
        
        // Validar tipo
        const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            showMessage(`"${file.name}" não é JPG, PNG ou PDF.`, 'error');
            continue;
        }
        
        files.push(file);
    }
    
    updateFileList();
}

// Atualizar lista de arquivos
function updateFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    if (files.length === 0) {
        return;
    }
    
    files.forEach((file, index) => {
        const fileSize = (file.size / (1024 * 1024)).toFixed(2);
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-name">
                <i class="fas fa-file"></i>
                <span>${file.name}</span>
                <small>(${fileSize} MB)</small>
            </div>
            <button type="button" class="file-remove" data-index="${index}">
                <i class="fas fa-times"></i>
            </button>
        `;
        fileList.appendChild(fileItem);
    });
}

// Remover arquivo
function removerArquivo(index) {
    if (confirm('Remover este arquivo?')) {
        files.splice(index, 1);
        updateFileList();
    }
}

// Validar formulário
function validateForm() {
    const required = ['titulo', 'categoria', 'prioridade', 'setor', 'descricao'];
    let isValid = true;
    
    required.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            field.style.borderColor = '#dc3545';
            isValid = false;
        } else {
            field.style.borderColor = '#ddd';
        }
    });
    
    if (!isValid) {
        showMessage('Preencha todos os campos obrigatórios!', 'error');
    }
    
    return isValid;
}

// Auto-preenchimento para desenvolvimento
function autoFillForDevelopment() {
    document.getElementById('titulo').value = 'Computador não está ligando';
    document.getElementById('descricao').value = 'O computador da mesa 5 não liga desde ontem. Já verifiquei o cabo de força e a tomada.';
    document.getElementById('telefone').value = '1234';
}

// Manipular envio do formulário
async function handleSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    console.log('[DEBUG] handleSubmit: Formulário validado com sucesso.');

    // Coletar dados do formulário
    const dadosChamado = {
        titulo: document.getElementById('titulo').value,
        categoria: document.getElementById('categoria').value,
        prioridade: document.getElementById('prioridade').value,
        setor: document.getElementById('setor').value,
        descricao: document.getElementById('descricao').value,
        telefone: document.getElementById('telefone').value || '',
        notificar_email: document.getElementById('notificarEmail').checked,
        notificar_whatsapp: document.getElementById('notificarWhatsapp').checked,
        usuario_id: localStorage.getItem('semjel_user_id') || '1',
        status: 'aberto'
    };
    
    // Mostrar preview antes de enviar
    previewChamado(dadosChamado);
    
    // Armazenar dados para possível envio
    window.dadosChamadoParaEnviar = dadosChamado;
}

// Mostrar preview do chamado
function previewChamado(dados) {
    const categorias = {
        hardware: '🖥️ Hardware',
        software: '💿 Software',
        rede: '🌐 Rede/Internet',
        impressora: '🖨️ Impressora',
        periferico: '⌨️ Periféricos',
        email: '📧 Email',
        outros: '❓ Outros'
    };
    
    const prioridades = {
        baixa: '🟢 Baixa',
        normal: '🟡 Normal',
        alta: '🟠 Alta',
        urgente: '🔴 Urgente'
    };
    
    const previewHTML = `
        <div class="preview-section">
            <h4><i class="fas fa-info-circle"></i> Informações Básicas</h4>
            <p><strong>Título:</strong> ${dados.titulo}</p>
            <p><strong>Categoria:</strong> ${categorias[dados.categoria] || dados.categoria}</p>
            <p><strong>Prioridade:</strong> ${prioridades[dados.prioridade] || dados.prioridade}</p>
            <p><strong>Setor:</strong> ${dados.setor}</p>
        </div>
        
        <div class="preview-section">
            <h4><i class="fas fa-align-left"></i> Descrição</h4>
            <p>${dados.descricao.replace(/\n/g, '<br>')}</p>
        </div>
        
        <div class="preview-section">
            <h4><i class="fas fa-paperclip"></i> Anexos</h4>
            <p>${files.length > 0 ? `${files.length} arquivo(s) anexado(s)` : 'Nenhum arquivo anexado'}</p>
        </div>
        
        <div class="preview-section">
            <h4><i class="fas fa-phone-alt"></i> Contato</h4>
            <p><strong>Telefone/Ramal:</strong> ${dados.telefone || 'Não informado'}</p>
            <p><strong>Notificações:</strong> 
                ${dados.notificar_email ? 'Email ✓ ' : ''}
                ${dados.notificar_whatsapp ? 'WhatsApp ✓' : ''}
                ${!dados.notificar_email && !dados.notificar_whatsapp ? 'Nenhuma' : ''}
            </p>
        </div>
        
        <div class="preview-notice">
            <p><i class="fas fa-exclamation-circle"></i> Após enviar, você receberá um número de protocolo para acompanhamento.</p>
        </div>
    `;
    
    document.getElementById('previewBody').innerHTML = previewHTML;
    document.getElementById('previewModal').classList.remove('hidden');
}

// Fechar preview
function fecharPreview() {
    document.getElementById('previewModal').classList.add('hidden');
}

// Enviar chamado para API REAL
async function enviarChamado() {
    const submitBtn = document.querySelector('#previewModal .btn-primary');
    const originalText = submitBtn.innerHTML;
    
    // Mostrar loading
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    submitBtn.disabled = true;
    
    const token = localStorage.getItem('semjel_token');
    const dados = window.dadosChamadoParaEnviar;
    
    console.log('[DEBUG] enviarChamado: Iniciando FETCH para', API_URL + '/chamados');
    console.log('[DEBUG] Payload:', dados);

    try {
        // ENVIO REAL PARA API
        const response = await fetch(`${API_URL}/chamados`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dados)
        });
        
        if (response.status === 401) {
            localStorage.clear();
            window.location.href = 'index.html';
            return;
        }

        if (response.ok) {
            const resultado = await response.json();
            
            // Mensagem de sucesso
            const protocolo = resultado.id ? `CH-${String(resultado.id).padStart(4, '0')}` : 'CH-NOVO';
            showMessage(`✅ Chamado criado com sucesso! Protocolo: ${protocolo}`, 'success');
            
            // Limpar formulário
            document.getElementById('formNovoChamado').reset();
            files = [];
            updateFileList();
            
            // Fechar preview
            fecharPreview();
            
            // Redirecionar após 3 segundos
            setTimeout(() => {
                console.log('[DEBUG] Redirecionando para dashboard...');
                window.location.href = 'dashboard.html';
            }, 3000);
            
        } else {
            const erro = await response.json();
            throw new Error(erro.message || 'Erro ao criar chamado');
        }
        
    } catch (error) {
        console.error('[DEBUG] enviarChamado ERRO:', error);
        alert('ERRO AO ENVIAR CHAMADO: ' + error.message);
        showMessage(`❌ Erro: Falha de conexão com a API (${error.message})`, 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Mostrar mensagens
function showMessage(text, type = 'info') {
    const messageBox = document.getElementById('messageBox');
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    messageBox.innerHTML = `
        <i class="${icons[type]}" style="color: ${colors[type]}; margin-right: 10px;"></i>
        ${text}
    `;
    messageBox.className = 'message-box show';
    
    setTimeout(() => {
        messageBox.className = 'message-box';
    }, 5000);
}
// =============================================================================
// novo-chamado.js — Criação de Chamados com Supabase
// =============================================================================
'use strict';

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
    
    // Carregar setores do banco de dados
    carregarDropdownSetores();
    
    // Configurar upload de arquivos
    setupFileUpload();
    
    console.log('[DEBUG] novo-chamado.js Supabase V1 CARREGADO!');

    // Configurar envio do formulário
    document.getElementById('formNovoChamado').addEventListener('submit', handleSubmit);
    
    // Event listeners CSP-Safe
    document.getElementById('btnCancelar')?.addEventListener('click', () => window.location.href='dashboard.html');
    document.getElementById('uploadArea')?.addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('btnPreviewCloseTop')?.addEventListener('click', (e) => { e.preventDefault(); fecharPreview(); });
    document.getElementById('btnPreviewCloseBottom')?.addEventListener('click', (e) => { e.preventDefault(); fecharPreview(); });
    document.getElementById('btnConfirmarEnviar')?.addEventListener('click', (e) => { e.preventDefault(); enviarChamado(); });

    // Event delegation para remover arquivo
    document.getElementById('fileList')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.file-remove');
        if (btn) {
            e.preventDefault();
            removerArquivo(parseInt(btn.getAttribute('data-index')));
        }
    });
    
    // Auto-preenchimento para desenvolvimento
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
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
    
    // Validar setor via hidden input (searchable dropdown)
    const setorHidden = document.getElementById('setorHidden');
    const setorValor = setorHidden ? setorHidden.value.trim() : '';
    const setorInput = document.getElementById('setorInput');

    required.forEach(fieldId => {
        if (fieldId === 'setor') {
            if (!setorValor) {
                if (setorInput) setorInput.style.borderColor = '#dc3545';
                isValid = false;
            } else {
                if (setorInput) setorInput.style.borderColor = '#ddd';
            }
            return;
        }
        const field = document.getElementById(fieldId);
        if (!field) return;
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
    const setorHidden = document.getElementById('setorHidden');
    const dadosChamado = {
        titulo: document.getElementById('titulo').value,
        categoria: document.getElementById('categoria').value,
        prioridade: document.getElementById('prioridade').value,
        setor: setorHidden ? setorHidden.value.trim() : document.getElementById('setorInput')?.value.trim() || '',
        descricao: document.getElementById('descricao').value,
        telefone: document.getElementById('telefone').value || '',
        notificar_email: document.getElementById('notificarEmail').checked,
        notificar_whatsapp: document.getElementById('notificarWhatsapp').checked
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

// Calcula o prazo SLA baseado na prioridade
function calcularSLA(prioridade) {
    const agora = new Date();
    const horas = { urgente: 4, alta: 24, normal: 72, baixa: 168 };
    agora.setHours(agora.getHours() + (horas[prioridade] || 72));
    return agora.toISOString();
}

// Enviar chamado para o Supabase
async function enviarChamado() {
    const submitBtn = document.querySelector('#previewModal .btn-primary');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    submitBtn.disabled = true;
    
    const client = window.supabaseClient;
    const dados = window.dadosChamadoParaEnviar;

    if (!client) {
        alert('Erro ao conectar ao Supabase. Tente novamente.');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        return;
    }

    try {
        let anexoUrl = null;

        // 1. Upload do anexo (se houver arquivo selecionado)
        if (files.length > 0) {
            const file = files[0]; // Focando no primeiro arquivo
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
            const filePath = `chamados/${fileName}`;

            const { data: uploadData, error: uploadError } = await client.storage
                .from('anexos')
                .upload(filePath, file);

            if (uploadError) {
                console.error("[UPLOAD ERROR]", uploadError);
                throw new Error(`Falha no upload do anexo: ${uploadError.message}`);
            }

            // Obter URL pública do anexo
            const { data: urlData } = client.storage
                .from('anexos')
                .getPublicUrl(filePath);

            anexoUrl = urlData.publicUrl;
        }

        // 2. Coletar dados do perfil do usuário logado
        const userId = localStorage.getItem('semjel_user_id');
        const userName = localStorage.getItem('semjel_user_name');
        
        const { data: userProfile, error: profileError } = await client
            .from('usuarios')
            .select('setor')
            .eq('id', userId)
            .single();

        if (profileError) {
            throw new Error(`Erro ao buscar dados do usuário: ${profileError.message}`);
        }

        const userSetor = userProfile?.setor || 'A Definir';
        const prazoSla = calcularSLA(dados.prioridade);

        // 3. Salvar chamado no banco de dados
        const { data: ticket, error: ticketError } = await client
            .from('chamados')
            .insert([{
                titulo: dados.titulo,
                descricao: dados.descricao,
                categoria: dados.categoria,
                prioridade: dados.prioridade,
                status: 'aberto',
                usuario_id: userId,
                usuario_nome: userName,
                usuario_setor: userSetor,
                setor_solicitante: dados.setor,
                telefone_contato: dados.telefone,
                prazo_sla: prazoSla,
                anexo_url: anexoUrl
            }])
            .select()
            .single();

        if (ticketError) {
            throw ticketError;
        }

        const protocolo = ticket.id ? `CH-${String(ticket.id).padStart(4, '0')}` : 'CH-NOVO';
        showMessage(`✅ Chamado criado com sucesso! Protocolo: ${protocolo}`, 'success');
        
        // Limpar formulário
        document.getElementById('formNovoChamado').reset();
        files = [];
        updateFileList();
        
        fecharPreview();
        
        // Redirecionar após 3 segundos
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 3000);
        
    } catch (error) {
        console.error('[SUPABASE TICKETS ERROR]', error);
        alert('ERRO AO ENVIAR CHAMADO: ' + error.message);
        showMessage(`❌ Erro: Falha ao registrar chamado (${error.message})`, 'error');
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

// Carregar setores/locais dinamicamente do Supabase
async function carregarDropdownSetores() {
    const client = window.supabaseClient;
    const wrapEl = document.getElementById('setorWrap');
    const inputEl = document.getElementById('setorInput');
    const dropdownEl = document.getElementById('setorDropdown');
    const hiddenEl = document.getElementById('setorHidden');
    if (!inputEl || !dropdownEl) return;

    if (!client) {
        inputEl.placeholder = 'Erro ao carregar (Supabase Offline)';
        return;
    }

    try {
        const { data: locais, error } = await client
            .from('locais')
            .select('id, nome')
            .order('id', { ascending: true }); // ← Ordenado por ID

        if (error) throw error;

        const opcoes = locais ? locais.map(l => l.nome) : [];
        if (opcoes.length > 0) opcoes.push('Outro (Não listado)');

        function renderOpcoes(filtro) {
            dropdownEl.innerHTML = '';
            const filtradas = filtro
                ? opcoes.filter(o => o.toLowerCase().includes(filtro.toLowerCase()))
                : opcoes;

            if (!filtradas.length) {
                dropdownEl.innerHTML = '<div class="searchable-no-result">Nenhum resultado</div>';
            } else {
                filtradas.forEach(op => {
                    const div = document.createElement('div');
                    div.className = 'searchable-option';
                    div.textContent = op;
                    div.addEventListener('mousedown', e => {
                        e.preventDefault();
                        inputEl.value = op;
                        hiddenEl.value = op;
                        dropdownEl.classList.remove('open');
                    });
                    dropdownEl.appendChild(div);
                });
            }
            dropdownEl.classList.add('open');
        }

        inputEl.addEventListener('focus', () => renderOpcoes(inputEl.value));
        inputEl.addEventListener('input', () => {
            hiddenEl.value = inputEl.value;
            renderOpcoes(inputEl.value);
        });
        inputEl.addEventListener('blur', () => {
            setTimeout(() => dropdownEl.classList.remove('open'), 200);
        });

        if (!locais || !locais.length) {
            inputEl.placeholder = 'Nenhum setor cadastrado. Contate a TI.';
        }
    } catch (err) {
        console.error('[ERRO CARREGAR SETORES]', err);
        if (inputEl) inputEl.placeholder = 'Erro ao carregar setores';
    }
}
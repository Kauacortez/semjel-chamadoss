// =============================================================================
// auth.js — Autenticação SEMJEL com Supabase
// =============================================================================
'use strict';

document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const senhaInput = document.getElementById('senha');
    const togglePwd = document.getElementById('togglePassword');
    const messageBox = document.getElementById('messageBox');
    const messageText = document.getElementById('messageText');
    const messageIcon = document.getElementById('messageIcon');

    // Verificar se já está logado e redirecionar pelo papel
    checkLoginStatus();

    // Mostrar/ocultar senha
    if (togglePwd) {
        togglePwd.addEventListener('click', function () {
            const type = senhaInput.getAttribute('type') === 'password' ? 'text' : 'password';
            senhaInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Submissão do formulário
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const email = emailInput.value.trim().toLowerCase();
            const senha = senhaInput.value;

            if (!email || !senha) {
                showMessage('Preencha todos os campos.', 'error');
                return;
            }

            // Validar domínio institucional
            if (!email.endsWith('@semjel.gov.br')) {
                showMessage('Use o email institucional @semjel.gov.br', 'error');
                return;
            }

            const submitBtn = loginForm.querySelector('.login-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Autenticando...';
            submitBtn.disabled = true;

            const client = window.supabaseClient;
            if (!client) {
                showMessage('Erro na inicialização do Supabase. Verifique a configuração.', 'error');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                return;
            }

            try {
                // 1. Tentar login direto no Supabase Auth
                let { data, error } = await client.auth.signInWithPassword({
                    email: email,
                    password: senha,
                });

                // 2. Se falhar por credenciais inválidas, pode ser um usuário novo (Auto-cadastro)
                if (error) {
                    const errorMsg = error.message.toLowerCase();
                    
                    if (errorMsg.includes("invalid login credentials") || errorMsg.includes("invalid credentials")) {
                        // Extrair nome amigável a partir do email
                        const parteNome = email.split('@')[0];
                        const nomeCalculado = parteNome
                            .replace(/[^a-zA-Z.]/g, '')
                            .split('.')
                            .map(p => p.charAt(0).toUpperCase() + p.slice(1))
                            .join(' ');
                        
                        const nomeFinal = nomeCalculado || 'Usuário SEMJEL';

                        showMessage('Primeiro acesso detectado. Criando conta...', 'info');

                        // Cadastrar novo usuário (automaticamente insere na tabela public.usuarios via trigger no banco)
                        const { data: signUpData, error: signUpError } = await client.auth.signUp({
                            email: email,
                            password: senha,
                            options: {
                                data: {
                                    nome: nomeFinal,
                                    setor: 'A Definir',
                                    papel: 'usuario'
                                }
                            }
                        });

                        if (signUpError) {
                            throw signUpError;
                        }

                        // Se o login for automático após cadastro
                        if (signUpData.session) {
                            data = signUpData;
                        } else {
                            // Caso precise confirmar e-mail (se ativado no Supabase)
                            showMessage('Cadastro realizado! Por favor, verifique seu e-mail para confirmar a conta.', 'warning');
                            submitBtn.innerHTML = originalText;
                            submitBtn.disabled = false;
                            return;
                        }
                    } else {
                        throw error;
                    }
                }

                if (data && data.session) {
                    const session = data.session;
                    
                    // 3. Buscar os detalhes complementares na tabela public.usuarios (cargo, setor, ativo)
                    const { data: profile, error: profileError } = await client
                        .from('usuarios')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (profileError) {
                        throw profileError;
                    }

                    if (!profile.ativo) {
                        // Logout caso conta esteja inativa
                        await client.auth.signOut();
                        showMessage('Sua conta foi desativada. Entre em contato com a TI.', 'error');
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;
                        return;
                    }

                    // Registrar data e contador de acessos online diretamente no banco
                    try {
                        const totalAcessosAtual = (profile.total_acessos || 0) + 1;
                        await client
                            .from('usuarios')
                            .update({
                                ultimo_acesso: new Date().toISOString(),
                                total_acessos: totalAcessosAtual
                            })
                            .eq('id', profile.id);
                    } catch (acessError) {
                        console.error('Erro ao registrar acesso:', acessError);
                    }

                    // 4. Salvar dados de sessão no localStorage
                    localStorage.setItem('semjel_token', session.access_token);
                    localStorage.setItem('semjel_logged_in', 'true');
                    localStorage.setItem('semjel_user_email', profile.email);
                    localStorage.setItem('semjel_user_name', profile.nome);
                    localStorage.setItem('semjel_user_id', profile.id);
                    localStorage.setItem('semjel_user_papel', profile.papel);

                    showMessage('Login realizado com sucesso! Redirecionando...', 'success');


                    // Redirecionar de acordo com o papel
                    setTimeout(() => {
                        if (profile.papel === 'admin') {
                            window.location.href = 'admin-dashboard.html';
                        } else {
                            window.location.href = 'dashboard.html';
                        }
                    }, 1200);
                }

            } catch (err) {
                console.error("[AUTH ERROR]", err);
                showMessage(err.message || 'Erro ao conectar ao servidor de autenticação.', 'error');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Verificar status de login e redirecionar pelo papel
    function checkLoginStatus() {
        const isLoggedIn = localStorage.getItem('semjel_logged_in');
        const papel = localStorage.getItem('semjel_user_papel');
        const page = window.location.pathname;

        if (isLoggedIn === 'true' && (page.endsWith('index.html') || page.endsWith('/'))) {
            window.location.href = papel === 'admin' ? 'admin-dashboard.html' : 'dashboard.html';
        }
    }

    // Mostrar mensagens
    function showMessage(text, type = 'info') {
        messageText.textContent = text;
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        messageIcon.className = icons[type] || icons.info;
        messageIcon.style.color = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        }[type];

        messageBox.classList.remove('hidden');
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 5000);
    }
});

// Logout global
function logout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        const client = window.supabaseClient;
        if (client) {
            client.auth.signOut().catch(console.error);
        }
        ['semjel_token', 'semjel_logged_in', 'semjel_user_email',
            'semjel_user_name', 'semjel_user_id', 'semjel_user_papel'].forEach(k => {
                localStorage.removeItem(k);
            });
        window.location.replace('index.html');
    }
}
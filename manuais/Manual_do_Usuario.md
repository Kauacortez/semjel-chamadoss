# 📘 Manual do Usuário — SEMJEL Chamados TI
**Versão 1.1 — Atualizado em Abril/2026**

Bem-vindo ao **Sistema de Gestão de Chamados de TI da SEMJEL**! Este é o portal oficial para você solicitar suporte técnico, reportar problemas com equipamentos, internet, impressoras, programas e qualquer dúvida relacionada à tecnologia no seu trabalho.

Este manual foi escrito de forma simples, passo a passo, para que qualquer funcionário consiga usar o sistema sem dificuldades. Leia com calma e siga as instruções na ordem.

---

## 📋 Sumário

1. [O que é este sistema e para que serve?](#1-o-que-é-este-sistema-e-para-que-serve)
2. [Como acessar o sistema pela primeira vez (Cadastro Automático)](#2-como-acessar-o-sistema-pela-primeira-vez)
3. [Como entrar no sistema (Login)](#3-como-entrar-no-sistema-login)
4. [Visão Geral: O Painel de Controle (Dashboard)](#4-visão-geral-o-painel-de-controle-dashboard)
5. [Como Abrir um Novo Chamado (Pedir Suporte)](#5-como-abrir-um-novo-chamado)
6. [Como Anexar Fotos ou Arquivos ao Chamado](#6-como-anexar-fotos-ou-arquivos-ao-chamado)
7. [A Pré-Visualização antes de Enviar](#7-a-pré-visualização-antes-de-enviar)
8. [Como Acompanhar o Status do seu Chamado](#8-como-acompanhar-o-status-do-seu-chamado)
9. [Como Sair do Sistema com Segurança](#9-como-sair-do-sistema-com-segurança)
10. [Dicas Importantes e Boas Práticas](#10-dicas-importantes-e-boas-práticas)
11. [O que fazer se tiver dificuldades?](#11-o-que-fazer-se-tiver-dificuldades)

---

## 1. O que é este sistema e para que serve?

O **SEMJEL Chamados TI** é um sistema interno (funciona somente dentro da rede da Secretaria) que substitui o antigo processo de ligar ou ir pessoalmente até o setor de TI para pedir suporte.

**Com ele você pode:**
- ✅ Registrar qualquer problema técnico de forma organizada
- ✅ Acompanhar em tempo real o que a TI está fazendo com seu chamado
- ✅ Ver o histórico de todos os problemas que você já reportou
- ✅ Enviar fotos ou arquivos para ajudar a TI a entender melhor o problema

**Tipos de problemas que você pode reportar:**
- 🖥️ **Hardware** — Computador, notebook, teclado, mouse, monitor
- 💿 **Software** — Programas que não abrem, travamentos, erros na tela
- 🌐 **Rede/Internet** — Internet lenta, sem conexão, Wi-Fi caído
- 🖨️ **Impressora** — Não imprime, não liga, papel preso
- ⌨️ **Periféricos** — Qualquer acessório conectado ao computador
- 📧 **Email Corporativo** — Problemas com o email institucional
- ❓ **Outros** — Qualquer outro problema tecnológico

---

## 2. Como acessar o sistema pela primeira vez

> ℹ️ **Importante:** Você **não precisa** pedir para a TI criar uma conta. O sistema cria a sua conta automaticamente quando você acessa pela primeira vez!

### Pré-requisito: Ter um e-mail institucional da SEMJEL
Seu e-mail deve terminar obrigatoriamente com **`@semjel.gov.br`**.
- ✅ Correto: `maria.silva@semjel.gov.br`
- ❌ Errado: `maria.silva@gmail.com` (não será aceito)

Se você não sabe qual é o seu e-mail institucional, entre em contato com a TI.

### Passo a passo:
1. **Abra o navegador** do seu computador (Google Chrome, Microsoft Edge ou Firefox — qualquer um funciona).
2. **Digite o endereço** do sistema na barra de endereços e pressione **Enter**:
   ```
   http://servidor-ti:3000
   ```
   > 💡 O endereço exato será fornecido pela equipe de TI. Guarde esse endereço nos favoritos do seu navegador para facilitar o acesso futuro.

3. **A tela de login aparecerá.** Você verá dois campos em branco.
4. **No campo "E-mail"**, digite seu e-mail institucional completo.
5. **No campo "Senha"**, escolha e digite uma senha que você vai lembrar. Esta será sua senha daqui para frente. Use algo seguro (misture letras maiúsculas, minúsculas e números).
6. Clique no botão **"Entrar no Sistema"**.
7. Pronto! Sua conta é criada automaticamente e você já entrará no sistema.

> ⚠️ **Atenção:** Na primeira vez, você estará **definindo** sua senha. Nas próximas vezes que acessar, use sempre a mesma senha que criou aqui.

---

## 3. Como entrar no sistema (Login)

Para os próximos acessos (após o primeiro):

1. Abra o navegador e acesse `http://servidor-ti:3000`
2. Digite seu **e-mail institucional** (`@semjel.gov.br`)
3. Digite sua **senha** (a mesma que você criou no primeiro acesso)
4. Clique em **"Entrar no Sistema"**

### O que fazer se esquecer a senha?
Entre em contato com a equipe de TI para que ela redefina seu acesso. O sistema não possui, por enquanto, recuperação de senha automática por e-mail.

### Por que não consigo entrar? (possíveis causas)
| Situação | O que fazer |
|---|---|
| Mensagem "e-mail inválido" | Verifique se digitou `@semjel.gov.br` corretamente |
| Mensagem "senha incorreta" | Tente digitar a senha novamente com cuidado (ela diferencia maiúsculas de minúsculas) |
| Mensagem "Muitas tentativas" | Aguarde **15 minutos** e tente novamente. O sistema bloqueia temporariamente para segurança |
| Tela em branco | Verifique se você está conectado à rede da SEMJEL |

---

## 4. Visão Geral: O Painel de Controle (Dashboard)

Após fazer login com sucesso, você verá o **Painel de Controle** — a tela principal do sistema. Veja o que cada parte significa:

### 🔢 Os Cartões de Resumo (parte de cima da tela)
São 3 contadores coloridos que mostram um resumo rápido dos seus chamados:

| Cor | Nome | O que significa |
|---|---|---|
| 🔴 Vermelho | **Abertos** | Chamados que você criou e estão na fila aguardando a TI |
| 🟡 Amarelo | **Em Andamento** | Chamados que um técnico já está trabalhando |
| 🟢 Verde | **Resolvidos** | Chamados que já foram finalizados e resolvidos |

### 📋 A Tabela "Meus Chamados"
Abaixo dos cartões, há uma tabela listando **todos os chamados que você já criou**, do mais recente para o mais antigo. Cada linha da tabela mostra:
- **Data/Hora** — Quando você abriu o chamado
- **Título** — O resumo do problema que você descreveu
- **Categoria** — O tipo de problema (hardware, impressora, etc.)
- **Prioridade** — A urgência que você classificou (Baixa, Normal, Alta, Urgente)
- **Status** — A situação atual (Aberto, Em Andamento, Resolvido, Fechado)

> 💡 **Dica:** Você pode clicar em qualquer chamado da tabela para ver mais detalhes sobre ele.

---

## 5. Como Abrir um Novo Chamado

Esta é a função mais importante do sistema! Siga os passos abaixo com atenção.

### Passo 1 — Acessar o formulário
No menu lateral esquerdo, clique em **"Novo Chamado"** (você verá um ícone de "+"). Isso abrirá o formulário de registro.

### Passo 2 — Preencher as Informações Básicas

**A) Título do Chamado** *(obrigatório)*
- Escreva um resumo curto e claro do problema
- ✅ **Bom exemplo:** `"Impressora do setor Administrativo não liga"`
- ✅ **Bom exemplo:** `"Internet caiu em todos os computadores do Financeiro"`
- ❌ **Evite:** `"Ajuda"` ou `"Não funciona"` (muito vago)

**B) Categoria** *(obrigatório)*
- Selecione na lista o tipo de problema. As opções são:
  - 🖥️ **Hardware** — Para problemas com o computador ou partes físicas dele
  - 💿 **Software** — Para problemas com programas instalados
  - 🌐 **Rede/Internet** — Para falta ou lentidão de internet
  - 🖨️ **Impressora** — Para qualquer tipo de problema com impressoras
  - ⌨️ **Periféricos** — Para teclado, mouse, pen drive, etc.
  - 📧 **Email/Corporativo** — Para problemas com o email institucional
  - ❓ **Outros** — Para qualquer outro problema tecnológico

**C) Prioridade** *(obrigatório — o padrão já vem marcado como "Normal")*

| Opção | Quando usar |
|---|---|
| 🟢 **Baixa** | Dúvidas simples, pedidos sem urgência. Não atrapalha seu trabalho. |
| 🟡 **Normal** | Problemas comuns que precisam ser resolvidos, mas você ainda consegue trabalhar de alguma forma. |
| 🟠 **Alta** | O problema está impedindo **você** de trabalhar normalmente. Precisam resolver hoje. |
| 🔴 **Urgente** | O problema está **parando o trabalho de várias pessoas** (setor inteiro sem internet, servidor fora do ar). |

> ⚠️ **Atenção:** Use "Urgente" apenas em situações que realmente paralisam o setor. O uso excessivo desta opção faz com que chamados realmente urgentes não recebam a atenção devida.

**D) Setor/Localização** *(obrigatório)*
- Selecione na lista o setor onde você está fisicamente localizado. Isso ajuda o técnico a saber para onde ir.
  - Administrativo
  - Atendimento ao Público
  - Financeiro
  - Jurídico
  - TI (Interno)
  - Outro Setor

### Passo 3 — Escrever a Descrição Detalhada

Este campo é muito importante! Quanto mais informações você der, mais rápido o técnico resolve.

**Responda a estas 4 perguntas na sua descrição:**
1. **O que está acontecendo?** — Descreva o problema
2. **Quando começou?** — Ontem? Hoje de manhã? Após instalar algo?
3. **Você já tentou alguma solução?** — Reiniciou? Desligou da tomada?
4. **Há alguma mensagem de erro?** — Se sim, escreva o texto exato da mensagem

**Exemplo de uma boa descrição:**
> *"O computador da mesa 3 não liga desde ontem à tarde. Já verifiquei se o cabo estava na tomada, troquei o cabo de força por um que funciona, mas nada. A luz da frente do computador não acende. Quando aperto o botão de ligar, não acontece nada."*

### Passo 4 — Informações de Contato

**Telefone/Ramal** *(opcional, mas recomendado)*
- Digite seu ramal interno ou número de celular para que a TI possa ligar se precisar de mais informações

**Notificações** *(opcional)*
- ✅ **Email** — Marque para receber atualizações do chamado no seu e-mail institucional (já vem marcado por padrão)
- ☐ **WhatsApp** — Marque se preferir receber notificações também pelo WhatsApp

---

## 6. Como Anexar Fotos ou Arquivos ao Chamado

O sistema permite que você envie arquivos junto com o chamado para ajudar a TI a entender o problema visualmente. Esta funcionalidade é **opcional**, mas muito útil!

**O que você pode enviar:**
- 📷 Fotos (formatos **JPG** ou **PNG**) — Ex: foto da tela com o erro, foto do equipamento danificado
- 📄 Documentos (formato **PDF**) — Ex: relatório de erro exportado
- **Tamanho máximo:** 5MB por arquivo

### Como fazer o upload:
1. No formulário de Novo Chamado, role a página para baixo até encontrar a seção **"Anexos (Opcional)"**
2. Clique na **área de upload** (você verá um ícone de nuvem com uma seta para cima)
3. Uma janela do seu computador se abrirá. Navegue até a foto ou arquivo que deseja enviar
4. Selecione o arquivo e clique em **"Abrir"**
5. Você pode selecionar **mais de um arquivo** ao mesmo tempo (segure a tecla Ctrl enquanto clica nos arquivos)
6. Os arquivos selecionados aparecerão listados abaixo da área de upload

> 💡 **Dica prática:** Se aparecer uma mensagem de erro na tela, tire uma foto com o celular ou pressione a tecla **Print Screen** (Impr Pant) no teclado para capturar a tela. Depois cole em qualquer programa de edição de imagem (Paint, por exemplo), salve como JPG e envie como anexo!

---

## 7. A Pré-Visualização antes de Enviar

Antes de enviar definitivamente o chamado, o sistema mostrará uma **tela de pré-visualização** para você conferir tudo.

### O que você verá na pré-visualização:
- O título que você escreveu
- A categoria e prioridade selecionadas
- Seu setor
- O texto da descrição completo
- A lista de arquivos que serão enviados (se houver)

### O que fazer:
- Se tudo estiver correto → clique em **"Confirmar e Enviar"**
- Se quiser corrigir algo → clique em **"Voltar para Editar"** e faça as alterações necessárias

Após enviar, você verá uma **mensagem verde de sucesso** e será automaticamente redirecionado para o seu Painel de Controle, onde o novo chamado já aparecerá no topo da lista.

---

## 8. Como Acompanhar o Status do seu Chamado

Depois de abrir um chamado, você não precisa ligar para a TI para saber o que está acontecendo. Basta verificar o status colorido na tabela do seu Dashboard!

### Entendendo os Status (significado de cada cor):

| Status | Cor | O que está acontecendo |
|---|---|---|
| **Aberto** | 🔴 Vermelho | Seu chamado foi registrado e a TI foi notificada. Está na fila aguardando um técnico. |
| **Em Andamento** | 🟡 Amarelo | Um técnico já assumiu seu chamado. Pode estar pesquisando a solução, adquirindo uma peça ou a caminho do seu setor. |
| **Resolvido** | 🟢 Verde | O técnico concluiu o atendimento e marcou o problema como resolvido. |
| **Fechado** | ⚫ Cinza/Preto | O chamado foi arquivado. Todo o histórico fica salvo para consulta futura. |

> ℹ️ **Importante:** Quando o status mudar para "Em Andamento" ou "Resolvido", você receberá uma notificação no seu e-mail institucional (se deixou a opção Email marcada ao criar o chamado).

---

## 9. Como Sair do Sistema com Segurança

**Nunca feche simplesmente o navegador sem fazer logout!** Qualquer pessoa que sentar no seu computador depois poderia acessar o sistema com a sua conta e abrir chamados no seu nome.

### Como fazer o logout corretamente:
1. Encontre o botão ou menu com o seu **nome de usuário** no **canto superior direito** da tela
2. Clique em **"Sair"** ou **"Logout"**
3. Você será redirecionado de volta para a tela de login

> ✅ **Hábito importante:** Sempre faça logout antes de se levantar da sua mesa, principalmente em computadores compartilhados!

---

## 10. Dicas Importantes e Boas Práticas

### ✅ Faça assim:
- **Seja específico no título e na descrição** — quanto mais detalhes, mais rápido o técnico soluciona
- **Informe seu ramal/telefone** — facilita muito o contato da TI com você
- **Tire foto da mensagem de erro** e anexe ao chamado
- **Use a prioridade corretamente** — classifique como "Urgente" apenas quando o setor inteiro estiver parado
- **Confira seus chamados periodicamente** — verifique se houve mudança de status

### ❌ Evite fazer isso:
- **Não abra múltiplos chamados para o mesmo problema** — um chamado já é suficiente; acompanhe pelo dashboard
- **Não escreva descrições vagas** como "não funciona" ou "deu erro" — isso atrasa muito o atendimento
- **Não use e-mail pessoal** (gmail, hotmail, etc.) para tentar acessar — só funciona com `@semjel.gov.br`
- **Não compartilhe sua senha** com outras pessoas

### ⏱️ Sobre os Prazos de Atendimento (estimativas):
| Prioridade | Prazo estimado de resposta |
|---|---|
| Urgente | Imediato (assim que possível) |
| Alta | Mesmo dia |
| Normal | Em até 24 horas úteis |
| Baixa | Em até 48-72 horas úteis |

> ℹ️ Os prazos acima são estimativas. Em períodos de alta demanda, podem variar. Consulte a TI para mais informações.

---

## 11. O que fazer se tiver dificuldades?

Se mesmo seguindo este manual você não conseguir acessar ou usar o sistema, siga estas alternativas:

1. **Ligue para a TI** no telefone central informado pela Secretaria
2. **Vá pessoalmente** ao setor de TI — é o único caso em que isso ainda é necessário
3. **Chame um colega** do seu setor que já conhece o sistema para te ajudar

---

> 📌 **Este manual é atualizado periodicamente pela TI da SEMJEL.**
> Guarde este documento nos seus favoritos ou imprima e cole perto do computador para facilitar consultas rápidas.

**Fim do Manual do Usuário.**

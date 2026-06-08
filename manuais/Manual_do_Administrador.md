# 🛡️ Manual do Administrador (TI) — SEMJEL Chamados
**Versão 1.1 — Atualizado em Abril/2026**

Este manual é destinado **exclusivamente para a equipe técnica de TI** responsável por instalar, configurar, manter e operar o sistema de chamados SEMJEL. Aqui você encontrará instruções claras para uma **instalação do zero em uma máquina nova**, além do gerenciamento diário de chamados e usuários.

---

## 📋 Sumário

1. [Visão Geral da Arquitetura do Sistema](#1-visão-geral-da-arquitetura-do-sistema)
2. [Pré-requisitos de Infraestrutura](#2-pré-requisitos-de-infraestrutura)
3. [Instalação do Sistema do Zero (Máquina Nova)](#3-instalação-do-sistema-do-zero-máquina-nova)
4. [Configuração das Variáveis de Ambiente (.env)](#4-configuração-das-variáveis-de-ambiente-env)
5. [Iniciando e Parando o Servidor](#5-iniciando-e-parando-o-servidor)
6. [Conta Administrador Padrão e Segurança Inicial](#6-conta-administrador-padrão-e-segurança-inicial)
7. [Como Promover um Usuário a Administrador](#7-como-promover-um-usuário-a-administrador)
8. [Navegando pelo Painel de Administrador](#8-navegando-pelo-painel-de-administrador)
9. [Gerenciando Chamados (Atualizar Status e Observações)](#9-gerenciando-chamados)
10. [Segurança: Rate Limiting e Bloqueios de IP](#10-segurança-rate-limiting-e-bloqueios)
11. [Monitorando os Logs da Aplicação](#11-monitorando-os-logs-da-aplicação)
12. [Backups do Banco de Dados](#12-backups-do-banco-de-dados)
13. [Estrutura de Arquivos do Projeto](#13-estrutura-de-arquivos-do-projeto)
14. [Solução de Problemas Comuns](#14-solução-de-problemas-comuns)

---

## 1. Visão Geral da Arquitetura do Sistema

O sistema SEMJEL Chamados é uma aplicação web que roda localmente (on-premise) dentro da rede interna da Secretaria. Ele é composto pelas seguintes tecnologias:

| Camada | Tecnologia | Função |
|---|---|---|
| **Servidor** | Node.js 18+ com Express.js | Processa todas as requisições da aplicação |
| **Banco de Dados** | SQLite3 | Armazena usuários, chamados e histórico (arquivo local `.sqlite`) |
| **Frontend** | HTML5 + JavaScript + CSS puro | Interface visual acessada pelo navegador |
| **Autenticação** | JWT (JSON Web Token) | Controla login e permissões de acesso (usuário comum vs. admin) |
| **Segurança** | Helmet + express-rate-limit | Proteção contra ataques comuns |

### Por que SQLite?
O SQLite é um banco de dados que funciona como um **arquivo único** no disco (sem necessidade de instalar MySQL, PostgreSQL, etc.). Isso simplifica enormemente a instalação e o backup — para fazer backup, basta copiar o arquivo `database.sqlite`.

### Fluxo de Autenticação (Resumo):
1. Usuário acessa `http://servidor-ti:3000` e insere e-mail + senha
2. O backend verifica as credenciais e gera um **Token JWT** (válido por tempo limitado)
3. O Frontend armazena o token e o envia em cada requisição subsequente
4. O backend valida o token e verifica se o papel (role) do usuário é `usuario` ou `admin`
5. Se o token indicar `admin`, o frontend redireciona automaticamente para `admin-dashboard.html`

---

## 2. Pré-requisitos de Infraestrutura

Antes de instalar, certifique-se de que a máquina servidora atende aos requisitos:

### Software obrigatório:
- **Node.js versão 18.0.0 ou superior** — [Baixe em nodejs.org](https://nodejs.org)
  - Para verificar se está instalado: abra o Prompt de Comando (cmd) e execute:
    ```
    node --version
    ```
  - Deve aparecer algo como `v18.12.0` ou superior
- **npm** — Vem automaticamente junto com o Node.js (gerenciador de pacotes)

### Rede:
- A máquina servidora precisa estar **conectada à rede interna** da SEMJEL
- A **porta 3000** deve estar acessível (liberada no firewall local do Windows ou no roteador, se necessário)
- Todos os computadores dos funcionários que acessarão o sistema devem estar na **mesma rede local**

### Hardware mínimo recomendado:
- 2GB de RAM livres
- 2GB de espaço em disco (o banco de dados cresce gradualmente)

---

## 3. Instalação do Sistema do Zero (Máquina Nova)

> ⚠️ **IMPORTANTE:** Este guia pressupõe uma **instalação a partir do zero em uma máquina nova** (Clean Install). Ele não cobre processos de atualização ou migração de instalações antigas. Certifique-se de estar configurando um ambiente limpo.

### Passo 1 — Copiar os arquivos do sistema

Mova (ou descompacte) a pasta do projeto para um local permanente no servidor. Exemplo:
```
C:\Sistemas\semjel-chamados\
```

Dentro dela, você deve ter esta estrutura:
```
semjel-chamados/
├── app/
│   ├── backend/       ← Servidor Node.js
│   └── frontend/      ← Telas HTML acessadas pelo navegador
├── backups/           ← Pasta para guardar backups
├── logs/              ← Registros de execução
└── manuais/           ← Este documento
```

### Passo 2 — Abrir o Prompt de Comando (cmd) como Administrador

No Windows:
1. Clique no Menu Iniciar
2. Digite `cmd`
3. Clique com o botão direito em "Prompt de Comando"
4. Selecione **"Executar como administrador"**

### Passo 3 — Navegar até a pasta do backend

No Prompt de Comando, execute (adapte o caminho para onde você colocou os arquivos):
```cmd
cd C:\Sistemas\semjel-chamados\app\backend
```

### Passo 4 — Instalar as dependências do Node.js

Este comando baixa todas as bibliotecas necessárias para o sistema funcionar. Você precisa de **acesso à internet apenas neste momento**:
```cmd
npm install
```

> ⏳ Aguarde. Pode demorar de 1 a 5 minutos dependendo da velocidade da internet. Quando terminar, você verá uma mensagem informando quantos pacotes foram instalados e uma pasta `node_modules` será criada automaticamente — **não apague esta pasta**.

> ⚠️ **Nota:** O arquivo `package.json` já contém todas as dependências mapeadas. O comando `npm install` lê esse arquivo e instala tudo automaticamente. As dependências principais são:
> - `express` — Framework do servidor web
> - `sqlite3` — Banco de dados
> - `bcryptjs` — Criptografia de senhas
> - `jsonwebtoken` — Autenticação via tokens
> - `helmet` — Segurança nos cabeçalhos HTTP
> - `express-rate-limit` — Proteção contra ataques de força bruta
> - `cors` — Controle de acesso entre origens

---

## 4. Configuração das Variáveis de Ambiente (.env)

O arquivo `.env` fica dentro da pasta `app/backend/` e contém configurações sensíveis do sistema. **Nunca compartilhe este arquivo publicamente.**

### Conteúdo atual do arquivo:
```env
PORT=3000
JWT_SECRET=semjel_chave_secreta_2024_ti
NODE_ENV=production
```

### O que cada linha significa:

| Variável | Valor Padrão | O que faz |
|---|---|---|
| `PORT` | `3000` | Porta em que o servidor vai escutar. `3000` significa que o acesso será pelo endereço `http://servidor-ti:3000` |
| `JWT_SECRET` | *(valor padrão)* | **CHAVE SECRETA** usada para assinar os tokens de autenticação. **Mude este valor antes de colocar em produção!** |
| `NODE_ENV` | `production` | Informa ao Node.js que é ambiente de produção (ativa otimizações) |

### 🔴 AÇÃO OBRIGATÓRIA — Troque o JWT_SECRET:
O valor padrão `semjel_chave_secreta_2024_ti` **deve ser substituído** por uma string aleatória e longa antes de deixar o sistema em uso. Esta chave protege todos os logins do sistema.

**Como gerar uma chave segura:**
1. No Prompt de Comando, execute:
   ```cmd
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
2. Copie o resultado (uma sequência longa de letras e números)
3. Substitua no `.env`:
   ```env
   JWT_SECRET=cole_aqui_sua_chave_gerada_acima
   ```

### Como mudar a porta (se necessário):
Se a porta 3000 já estiver em uso por outro sistema, altere para outra disponível (ex: 8080):
```env
PORT=8080
```
Neste caso, o endereço de acesso mudará para `http://servidor-ti:8080`.

---

## 5. Iniciando e Parando o Servidor

### Para iniciar o servidor:
No Prompt de Comando, dentro da pasta `app/backend/`, execute:
```cmd
node src/server.js
```

Você verá as seguintes mensagens no console confirmando que está tudo funcionando:
```
==================================================
🚀 Servidor SEMJEL: http://localhost:3000
📁 Frontend: C:\Sistemas\semjel-chamados\app\frontend
🔒 Segurança: Helmet + Rate-Limit ativos
==================================================
✅ Banco de dados conectado
```

> ✅ O sistema já está pronto para ser acessado pelos funcionários!

### Para parar o servidor:
No Prompt de Comando onde o servidor está rodando, pressione **Ctrl + C** e confirme com **S** (Sim).

### Para manter o servidor sempre ativo (recomendado em produção):

**Opção A — pm2 (recomendado para servidores Linux/Windows):**
```cmd
npm install -g pm2
pm2 start src/server.js --name "semjel"
pm2 save
pm2 startup
```
Com pm2, mesmo que o servidor reinicie, o sistema volta automaticamente.

**Opção B — NSSM (para Windows sem pm2):**
Instale o [NSSM](https://nssm.cc/) e registre o Node.js como serviço do Windows para que ele inicie automaticamente.

---

## 6. Conta Administrador Padrão e Segurança Inicial

Quando o servidor sobe pela **primeira vez** com o banco de dados vazio, ele cria automaticamente uma conta de administrador master:

| Campo | Valor Padrão |
|---|---|
| **E-mail** | `ti@semjel.gov.br` |
| **Senha** | `semjel123` |

### 🔴 AÇÃO URGENTE — Troque a senha padrão imediatamente!

Enquanto esta senha padrão existir, qualquer pessoa que conhecer o e-mail `ti@semjel.gov.br` pode acessar o painel admin. Siga os passos:

1. Acesse o sistema pelo navegador com as credenciais padrão
2. Você precisará alterar a senha diretamente no banco de dados. Siga as instruções da seção **"Acesso ao Banco de Dados SQLite"** abaixo.

### Como acessar o banco de dados SQLite para manutenção:

O arquivo do banco está em:
```
app/backend/src/database.sqlite
```

**Para abrir e editar via ferramenta gráfica (recomendado):**
Instale o **DB Browser for SQLite** (gratuito): [https://sqlitebrowser.org/](https://sqlitebrowser.org/)

1. Abra o DB Browser for SQLite
2. Clique em **"Abrir banco de dados"**
3. Navegue até `app/backend/src/database.sqlite`
4. Clique em **"Executar SQL"** (aba no topo)
5. Digite seu comando SQL e clique em **"Executar"**

> ⚠️ **Importante:** Sempre feche o DB Browser antes de reiniciar o servidor, para evitar conflitos de acesso ao arquivo.

---

## 7. Como Promover um Usuário a Administrador

Quando um técnico novo entrar na equipe de TI e precisar de acesso administrativo ao sistema, siga o procedimento:

1. Peça que o técnico **faça login normalmente** no sistema pelo menos uma vez (isso cria a conta dele automaticamente com papel `usuario`)

2. Abra o banco de dados no DB Browser for SQLite (veja seção 6)

3. Na aba **"Executar SQL"**, rode o seguinte comando (substituindo pelo e-mail real):
   ```sql
   UPDATE usuarios SET papel = 'admin' WHERE email = 'nome.tecnico@semjel.gov.br';
   ```

4. Clique em **"Executar"** e depois em **"Gravar alterações"** (ícone de disquete no topo)

5. Peça que o técnico faça logout e login novamente — desta vez ele será redirecionado para o painel de administrador.

### Para revogar acesso de administrador:
```sql
UPDATE usuarios SET papel = 'usuario' WHERE email = 'nome.tecnico@semjel.gov.br';
```

### Para ver todos os usuários e seus papéis:
```sql
SELECT nome, email, papel, criado_em FROM usuarios ORDER BY criado_em DESC;
```

---

## 8. Navegando pelo Painel de Administrador

O painel de administrador é acessado automaticamente quando você faz login com uma conta de papel `admin`. A URL correspondente é `admin-dashboard.html`.

> 🔒 **Segurança:** Se um usuário comum tentar acessar a URL do admin diretamente pelo navegador, o sistema detecta que o token JWT não tem papel `admin` e redireciona imediatamente para a tela de login. Não há risco de acesso não autorizado por digitação de URL.

### Aba: Dashboard Global
Esta é a tela inicial do painel administrativo. Você verá:
- **Total de chamados:** Quantos chamados foram registrados no sistema ao todo
- **Chamados por status:** Quantos estão Abertos, Em Andamento e Resolvidos no momento
- **Fila de chamados recentes:** Lista dos tickets mais novos, em ordem cronológica, para intervenção imediata
- **Atividade recente:** Chamados registrados nos últimos dias

### Aba: Todos os Chamados (Tickets Board)
Esta é a principal ferramenta de trabalho da TI. Aqui você vê **todos os chamados de todos os funcionários**.

**Recursos disponíveis:**
- 🔍 **Barra de busca:** Digite qualquer palavra para filtrar chamados (por título, setor, descrição, usuário, etc.)
- 🎛️ **Filtro por Status:** Veja somente os chamados Abertos, Em Andamento, Resolvidos ou Fechados
- 🎛️ **Filtro por Severidade:** Filtre por prioridade Urgente, Alta, Normal ou Baixa
- 📋 **Grade de chamados:** Cada card mostra: ID do chamado, título, usuário que abriu, setor, data, prioridade e status atual

### Aba: Usuários
Exibe um cadastro de todos os funcionários que já utilizaram o sistema, incluindo:
- Nome (extraído automaticamente do e-mail)
- E-mail institucional
- Papel no sistema (usuario/admin)
- Data de primeiro acesso

---

## 9. Gerenciando Chamados

### Como abrir o detalhe de um chamado:
Na aba "Todos os Chamados", clique no botão azul **"Detalhes"** no card do chamado desejado. Um modal (janela flutuante) abrirá com todas as informações.

### O que você verá no modal de detalhes:
- **Título e ID** do chamado
- **Usuário** que abriu e **Setor** de origem
- **Categoria** e **Prioridade**
- **Data e hora** de abertura
- **Descrição completa** fornecida pelo funcionário
- **Histórico de status** (linha do tempo das mudanças)
- **Observação Técnica** (campo exclusivo dos admins, invisível para usuários comuns)
- **Seletor de novo status** (para atualizar a situação do chamado)

### Como atualizar o status de um chamado:
1. No modal de detalhes, localize o **menu suspenso de Status**
2. Selecione o novo status:
   - **Aberto** → Chamado registrado, aguardando atendimento
   - **Em Andamento** → Você assumiu o chamado / está trabalhando nele
   - **Resolvido** → Problema solucionado
   - **Fechado** → Chamado arquivado definitivamente
3. Clique em **"Salvar Status"**
4. A atualização acontece instantaneamente sem recarregar a página inteira

> ✅ **Boas práticas:**
> - Mude para "Em Andamento" assim que pegar um chamado — isso avisa o funcionário que alguém está trabalhando na demanda dele
> - Mude para "Resolvido" imediatamente após concluir o atendimento, not dias depois
> - Use "Fechado" para arquivar chamados muito antigos e já resolvidos

### Como usar o campo "Observação Técnica":
Este campo é um **diário técnico exclusivo da TI** — os funcionários comuns não conseguem ver este campo. Use-o para registrar:
- O diagnóstico técnico do problema
- Peças substituídas (ex: "Memória RAM DDR4 8GB substituída")
- Referências de chamados relacionados
- Informações para futuras manutenções

**Exemplo de uma boa observação técnica:**
> *"Diagnóstico: Placa de vídeo com defeito físico (capacitor queimado visível). Computador encaminhado para manutenção externa. Usuário utilizando equipamento reserva (patrimônio 002183) temporariamente. Data prevista de retorno: 20/04/2026."*

---

## 10. Segurança: Rate Limiting e Bloqueios

O sistema possui proteção automática contra tentativas de invasão por força bruta (quando alguém fica tentando adivinhar senhas).

### Como funciona:
- **Tentativas de login:** Se um mesmo endereço IP fizer **mais de 10 tentativas de login incorretas** em uma janela de **15 minutos**, esse IP ficará **bloqueado por 15 minutos**
- **Requisições gerais:** Qualquer IP que faça um número excessivo de requisições à API também será limitado temporariamente

### O que o usuário verá durante o bloqueio:
Uma mensagem: *"Muitas tentativas de login. Tente novamente em 15 minutos."*

### Como desbloquear um IP antes dos 15 minutos (em caso de usuário legítimo):
O limite de rate existe **apenas em memória** (não persiste em banco). Para liberar imediatamente:
```cmd
(No console onde o servidor está rodando)
Ctrl + C  ← Para o servidor
node src/server.js  ← Reinicia o servidor (limpa os bloqueios em memória)
```

> ⚠️ **Atenção:** Reiniciar o servidor desbloqueia todos os IPs. Faça isso apenas quando tiver certeza de que se trata de um usuário legítimo bloqueado por engano (ex: funcionário que esqueceu a senha e tentou muitas vezes).

---

## 11. Monitorando os Logs da Aplicação

### Logs em tempo real (modo desenvolvimento):
Quando o servidor está rodando, todas as requisições aparecem no console (Prompt de Comando). Fique de olho em:
- `[POST] /api/auth/login 401 Unauthorized` → Tentativa de login com senha errada
- `[POST] /api/auth/login 200 OK` → Login bem-sucedido
- `[GET] /api/chamados 200 OK` → Usuário carregou seus chamados
- `[POST] /api/chamados 201 Created` → Novo chamado aberto
- `500 Server Error` → Erro interno grave — investigue imediatamente

### Com pm2 (se estiver usando):
```cmd
pm2 logs semjel          ← Ver logs em tempo real
pm2 logs semjel --lines 100  ← Ver as últimas 100 linhas
```

### Monitoramento de saúde do servidor:
O sistema possui um endpoint de verificação de saúde que retorna se está funcionando:
```
http://localhost:3000/health
```
Resposta esperada:
```json
{"status": "ok", "timestamp": "2026-04-13T12:00:00.000Z"}
```
Use este endpoint para automatizar verificações periódicas (scripts de monitoramento, Nagios, etc.).

---

## 12. Backups do Banco de Dados

> 🔴 **CRÍTICO:** O banco de dados SQLite é o coração do sistema. Sem backups, uma falha no disco pode resultar em perda total de todos os chamados e usuários. Configure backups **antes** de colocar o sistema em produção!

### Localização dos arquivos do banco:
```
app/backend/src/database.sqlite      ← Banco principal
app/backend/src/database.sqlite-shm  ← Arquivo de memória compartilhada (WAL)
app/backend/src/database.sqlite-wal  ← Write-Ahead Log (transações pendentes)
```

> ℹ️ Os arquivos `.sqlite-shm` e `.sqlite-wal` são criados automaticamente pelo modo WAL do SQLite para melhorar a performance. Sempre faça backup dos **três arquivos juntos**.

### Como fazer backup manual (Windows):
1. **Pare o servidor** (Ctrl + C no console) para garantir que não há transações em andamento
2. Copie os 3 arquivos para a pasta de backup:
   ```cmd
   xcopy "C:\Sistemas\semjel-chamados\app\backend\src\database.sqlite*" "C:\Sistemas\semjel-chamados\backups\backup_%date:~-4,4%%date:~-7,2%%date:~0,2%\" /E /I
   ```
3. Reinicie o servidor

### Como automatizar backups diários (Agendador de Tarefas do Windows):
1. Crie um arquivo `backup_semjel.bat` com o seguinte conteúdo:
   ```bat
   @echo off
   set BACKUP_DIR=C:\Sistemas\semjel-chamados\backups\%date:~-4,4%%date:~-7,2%%date:~0,2%
   mkdir "%BACKUP_DIR%"
   copy "C:\Sistemas\semjel-chamados\app\backend\src\database.sqlite" "%BACKUP_DIR%\"
   copy "C:\Sistemas\semjel-chamados\app\backend\src\database.sqlite-shm" "%BACKUP_DIR%\"
   copy "C:\Sistemas\semjel-chamados\app\backend\src\database.sqlite-wal" "%BACKUP_DIR%\"
   echo Backup concluído em %date% %time% >> "C:\Sistemas\semjel-chamados\logs\backup.log"
   ```
2. Abra o **Agendador de Tarefas** do Windows
3. Crie uma nova tarefa para executar `backup_semjel.bat` diariamente (recomendado: às 00:00 ou horário de menor uso)

### Política de retenção de backups:
Recomendamos guardar os backups por no mínimo **30 dias** antes de excluir os mais antigos.

---

## 13. Estrutura de Arquivos do Projeto

```
semjel-chamados/
├── app/
│   ├── backend/
│   │   ├── .env                    ← 🔴 Configurações sensíveis (JWT_SECRET, PORT)
│   │   ├── package.json            ← Lista de dependências do Node.js
│   │   ├── node_modules/           ← Bibliotecas instaladas (não editar manualmente)
│   │   └── src/
│   │       ├── server.js           ← Ponto de entrada principal do servidor
│   │       ├── config.js           ← Lê as variáveis de ambiente (.env)
│   │       ├── database.js         ← Conexão e configuração do SQLite
│   │       ├── database.sqlite     ← 🔴 BANCO DE DADOS (fazer backup!)
│   │       ├── controllers/        ← Lógica de negócio (auth, chamados, admin)
│   │       ├── middleware/         ← Autenticação JWT e verificação de roles
│   │       └── routes/             ← Definição das rotas da API REST
│   │           ├── auth.routes.js  ← /api/auth/login e /api/auth/register
│   │           ├── chamados.routes.js ← /api/chamados (CRUD de tickets)
│   │           └── admin.routes.js ← /api/admin/* (endpoints exclusivos admin)
│   └── frontend/
│       ├── index.html              ← Tela de Login
│       ├── dashboard.html          ← Painel do usuário comum
│       ├── novo-chamado.html       ← Formulário de abertura de chamado
│       ├── admin-dashboard.html    ← Painel exclusivo do administrador
│       ├── css/                    ← Estilos visuais
│       └── js/
│           ├── auth.js             ← Gerência de token JWT no frontend
│           ├── dashboard.js        ← Lógica do painel do usuário
│           ├── novo-chamado.js     ← Lógica do formulário com preview e upload
│           └── admin.js            ← Lógica completa do painel admin
├── backups/                        ← 🔴 Coloque seus backups aqui
├── logs/                           ← Registros de execução
└── manuais/                        ← Documentação (este arquivo)
```

---

## 14. Solução de Problemas Comuns

### ❌ "Cannot find module 'express'" ou similar
**Causa:** As dependências não foram instaladas.
**Solução:**
```cmd
cd app/backend
npm install
```

---

### ❌ Tela em branco ou "Não consegue acessar este site"
**Causas possíveis:**
1. O servidor não está rodando → Inicie com `node src/server.js`
2. IP ou porta incorretos → Confirme o endereço correto com a TI
3. Firewall bloqueando → No Windows, libere a porta 3000 nas regras do Firewall

**Como liberar porta no Windows Firewall:**
```
Painel de Controle → Firewall do Windows → Configurações Avançadas
→ Regras de Entrada → Nova Regra → Porta → TCP → 3000 → Permitir conexão
```

---

### ❌ Login retorna "E-mail ou senha inválidos"
**Causas:**
- Senha digitada errada
- E-mail sem o sufixo `@semjel.gov.br`
- Conta não existe ainda (primeiro acesso: o login cria a conta automaticamente)

---

### ❌ "Muitas tentativas. Tente novamente em 15 minutos"
**Causa:** Proteção de rate limit acionada.
**Solução:** Aguardar 15 minutos ou reiniciar o servidor (limpa os bloqueios em memória):
```cmd
Ctrl + C → node src/server.js
```

---

### ❌ Banco de dados corrompido após falha de energia
**Causa:** O SQLite em modo WAL pode ficar inconsistente se o servidor for encerrado abruptamente.
**Solução:**
1. Restaure o último backup válido
2. Copie o arquivo `database.sqlite` do backup para `app/backend/src/`
3. Delete os arquivos `.sqlite-shm` e `.sqlite-wal` se existirem
4. Reinicie o servidor

---

### ❌ Erros 500 no console
**Causa:** Erro interno grave da aplicação.
**O que fazer:**
1. Anote o horário exato do erro
2. Role o console para ver a mensagem de erro completa
3. Verifique se o banco de dados está íntegro e acessível
4. Reinicie o servidor após verificar os logs

---

> 📌 **Este manual é atualizado periodicamente pela equipe de TI da SEMJEL.**
> Para sugestões de melhoria ou relato de problemas não documentados aqui, contate o responsável pelo sistema.

**Fim do Manual do Administrador.**

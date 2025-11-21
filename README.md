# Gestão Documental

Sistema de Gestão Documental — plataforma web para armazenar, organizar e acompanhar documentos empresariais.

Demo: https://gestao-documental-gold.vercel.app
Repositório: https://github.com/SamuelWinnners/gestao-documental

Badges
- Build: (adicione badge do CI se houver)
- Deploy: Vercel
- License: (nenhuma definida)

## Índice
- [Sobre](#sobre)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Arquitetura e Estrutura](#arquitetura-e-estrutura)
- [Pré-requisitos](#pré-requisitos)
- [Instalação rápida](#instalação-rápida)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts úteis](#scripts-úteis)
- [API (endpoints principais)](#api-endpoints-principais)
- [Deploy](#deploy)
- [Segurança](#segurança)
- [Troubleshooting](#troubleshooting)
- [Contribuição](#contribuição)
- [Roadmap](#roadmap)
- [Licença](#licença)
- [Contato](#contato)

## Sobre
Gestão Documental é uma aplicação web desenvolvida para facilitar o controle de documentos de empresas e responsáveis, com foco em escritórios contábeis, departamentos administrativos e equipes de compliance. Permite upload, organização por empresas/responsáveis, cálculo de status por vencimento, buscas e dashboards de acompanhamento.

## Funcionalidades
- Dashboard com estatísticas (total de empresas, documentos, vencimentos, gráficos por status)
- CRUD de Empresas (validação de CNPJ e integração com serviço de consulta)
- CRUD de Responsáveis (associação à empresa, validação de contato)
- CRUD de Documentos (upload, download, preview, metadados)
- Cálculo automático de status por vencimento (normal / próximo / vencido)
- Filtros avançados e pesquisa por metadados
- Limite de upload (10 MB) e validação de tipos de arquivo
- Notificações locais (sucesso/erro) e alertas no dashboard

> Observação: atualize esta lista conforme novas funcionalidades forem adicionadas.

## Tecnologias
- Linguagem principal: JavaScript (Frontend e Backend)
- Estilos: CSS (Bootstrap 5.3)
- Backend: Node.js, Express
- Banco de Dados: MySQL
- Uploads: Multer
- Deploy: Railway (backend + MySQL) e Vercel (frontend)

## Arquitetura e Estrutura
Estrutura básica do repositório:

```
gestao-documental/
├── backend/
│   ├── server.js
│   ├── database.js
│   ├── database.sql
│   ├── check-tables.js
│   ├── .env
│   ├── .env.example
│   └── package.json
├── frontend/
│   └── public/
│       ├── index.html
│       ├── app.js
│       ├── style.css
│       └── icon.png
├── uploads/
│   └── documentos/
├── vercel.json
├── railway.toml
├── package.json
└── README.md
```

Descrição rápida:
- backend/: API REST em Node/Express responsável pela lógica, upload e conexão com MySQL.
- frontend/public/: interface SPA (HTML/CSS/JS) consumindo a API.
- uploads/: pasta onde os arquivos enviados são armazenados (evite versionar arquivos reais aqui).

## Pré-requisitos
- Node.js >= 18
- npm ou yarn
- MySQL 8+
- Git (opcional)

## Instalação rápida (desenvolvimento)
1. Clone o repositório

```bash
git clone https://github.com/SamuelWinnners/gestao-documental.git
cd gestao-documental
```

2. Backend: instalar dependências e configurar banco

```bash
cd backend
npm install
# Importar o esquema inicial no MySQL
mysql -u root -p railway < database.sql
```

3. Criar arquivo .env (exemplo em backend/.env.example)

4. Iniciar backend

```bash
npm start
```

5. Frontend: abrir frontend/public/index.html no navegador ou servir localmente (ex.: Live Server)

## Variáveis de ambiente
Crie um arquivo backend/.env com pelo menos as variáveis abaixo:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=railway
PORT=3000
NODE_ENV=development
# Variáveis opcionais
# API_CNPJ_URL=https://servico-cnpj.example
# JWT_SECRET=uma_chave_segura
```

Atualize de acordo com o ambiente de produção (Railway) ou Vercel.

## Scripts úteis (verificar backend/package.json)
- npm start — iniciar servidor em produção
- npm run dev — (se existir) iniciar servidor em modo desenvolvimento
- npm run build — (se aplicável)
- npm run lint — checar lint
- npm run test — executar testes

## API — Endpoints principais
Base local: http://localhost:3000/api
Produção: https://gestao-documental-production.up.railway.app/api

Empresas
- GET    /api/empresas
- GET    /api/empresas/:id
- POST   /api/empresas
- PUT    /api/empresas/:id
- DELETE /api/empresas/:id
- GET    /api/empresas/cnpj/:cnpj

Responsáveis
- GET    /api/responsaveis
- GET    /api/responsaveis/:id
- POST   /api/responsaveis
- PUT    /api/responsaveis/:id
- DELETE /api/responsaveis/:id
- GET    /api/responsaveis/empresa/:id

Documentos
- GET    /api/documentos
- GET    /api/documentos/:id
- POST   /api/documentos
- PUT    /api/documentos/:id
- DELETE /api/documentos/:id
- GET    /api/documentos/empresa/:id
- GET    /api/documentos/vencidos
- GET    /api/documentos/proximos
- GET    /api/documentos/:id/download

Dashboard
- GET    /api/dashboard/stats

Endpoint de saúde: /api/health

## Deploy
Backend (Railway)
- Serviço Node + MySQL
- Variáveis de ambiente configuradas no painel do Railway
- Configuração de build e start definida em railway.toml

Frontend (Vercel)
- Deploy estático usando vercel.json que roteia /api/* para o backend em Railway
- Configure variáveis de ambiente e domínio no painel do Vercel

## Segurança
- Limite de upload: 10MB
- Validação de tipos de arquivo
- Uso de prepared statements para reduzir risco de SQL Injection
- CORS configurado

Recomendações (próximo passo):
- Autenticação (JWT) e autorização por papéis
- Rate limiting
- HTTPS forçado (configuração na infra)
- Auditoria e logs mais ricos
- Backup automático do banco

## Troubleshooting
- Erro: Cannot connect to database
  - Verifique backend/.env, credenciais e se o MySQL está rodando
- Upload não funciona
  - Verifique existência da pasta uploads/documentos e permissões
  - Verifique limite de 10MB e tipos aceitos
- Frontend não carrega
  - Checar API_BASE em app.js
  - Abrir DevTools -> Console

## Contribuição
Obrigado por contribuir! Siga estas etapas:
1. Fork o repositório
2. Crie uma branch: `feature/minha-funcionalidade`
3. Faça commits pequenos e claros
4. Abra um Pull Request descrevendo as mudanças

Sugestões:
- Adicionar templates para ISSUE e PULL_REQUEST
- Adotar Conventional Commits
- Incluir checks de lint e testes no CI

## Roadmap
- Autenticação via OAuth/JWT
- Permissões por grupos e papéis
- Motor de OCR para indexação de conteúdo
- Integração com S3/Cloud Storage
- Relatórios PDF e envio automático de e-mails

## Licença
Atualmente: Projeto de uso interno. Todos os direitos reservados.

> Recomenda-se adicionar uma licença (ex.: MIT) se desejar tornar o projeto open-source.

## Contato
Samuel Winnners — https://github.com/SamuelWinnners

---
Atualizado automaticamente via assistant em 2025-11-21
📋 Sistema de Gestão Documental – Documentação Oficial
📖 1. Sobre o Sistema

O Sistema de Gestão Documental é uma plataforma web completa para controle de documentos empresariais, responsáveis e empresas, incluindo:

Controle de prazos e vencimentos

Upload e armazenamento de arquivos

Relatórios e dashboard

Filtros avançados

Integração com API de consulta de CNPJ

O sistema foi projetado para facilitar o trabalho de escritórios contábeis, departamentos administrativos e equipes de compliance.

🏗️ 2. Arquitetura do Sistema
2.1 Stack Tecnológica
Frontend

HTML5, CSS3, JavaScript (Vanilla)

Bootstrap 5.3

SPA (Single Page Application)

Comunicação via API REST

Backend

Node.js 18+

Express.js

MySQL 8.0

Multer (upload)

dotenv (variáveis de ambiente)

Infraestrutura

Railway: Backend + MySQL

Vercel: Frontend estático + proxy para API

📁 3. Estrutura do Projeto
gestao-documental/
│
├── backend/
│   ├── server.js
│   ├── database.js
│   ├── database.sql
│   ├── check-tables.js
│   ├── .env
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   └── public/
│       ├── index.html
│       ├── app.js
│       ├── style.css
│       └── icon.png
│
├── uploads/
│   └── documentos/
│
├── vercel.json
├── railway.toml
├── package.json
└── README.md

⚙️ 4. Funcionalidades Principais
4.1 Dashboard

Total de empresas

Total de documentos

Documentos próximos do vencimento

Documentos vencidos

Gráfico por status

4.2 Gestão de Empresas

CRUD completo

Consulta automática do CNPJ (ReceitaWS)

Busca e filtros

Validação de CNPJ

4.3 Gestão de Responsáveis

CRUD completo

Associação à empresa

Validação de e-mail e telefone

Filtro por empresa

4.4 Gestão de Documentos

CRUD completo

Upload de arquivos (PDF, DOC(X), XLS(X), JPG, PNG)

Limite: 10MB

Cálculo automático de status:

Normal: +30 dias

Próximo: 7–30 dias

Vencido: <7 dias

Download/visualização

Filtros avançados

4.5 Notificações

Sucesso/erro

Mensagens temporizadas

Alertas de operação

🗄️ 5. Modelo de Dados (Simplificado)
empresas
Campo	Tipo	Descrição
id	INT	PK
nome	VARCHAR(255)	Nome fantasia
cnpj	VARCHAR(18)	CNPJ único
created_at	TIMESTAMP	Criação
updated_at	TIMESTAMP	Atualização
responsaveis
Campo	Tipo	Descrição
id	INT	PK
empresa_id	INT	FK → empresas
nome	VARCHAR(255)	Nome
email	VARCHAR(255)	Email
telefone	VARCHAR(30)	Telefone
created_at	TIMESTAMP	Criação
documentos
Campo	Tipo	Descrição
id	INT	PK
empresa_id	INT	FK
responsavel_id	INT	FK
titulo	VARCHAR(255)	Nome do documento
tipo	VARCHAR(100)	Categoria
vencimento	DATE	Data de vencimento
arquivo_path	VARCHAR(500)	Caminho
status	ENUM	normal/proximo/vencido
created_at	TIMESTAMP	Criação
🚀 6. Como Executar Localmente
6.1 Requisitos

Node.js 18+

MySQL 8.0+

Git (opcional)

6.2 Configurar o Banco
CREATE DATABASE railway CHARACTER SET utf8mb4;


Terminal:

mysql -u root -p railway < backend/database.sql

6.3 Criar arquivo .env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=railway
PORT=3000
NODE_ENV=development

6.4 Instalar Dependências
cd backend
npm install

6.5 Iniciar o Backend
npm start

6.6 Abrir o Frontend

Abrir index.html diretamente
ou

Usar Live Server do VS Code

🌐 7. API REST – Endpoints

Base local: http://localhost:3000/api
Produção: https://gestao-documental-production.up.railway.app/api

Empresas
GET    /api/empresas
GET    /api/empresas/:id
POST   /api/empresas
PUT    /api/empresas/:id
DELETE /api/empresas/:id
GET    /api/empresas/cnpj/:cnpj

Responsáveis
GET    /api/responsaveis
GET    /api/responsaveis/:id
POST   /api/responsaveis
PUT    /api/responsaveis/:id
DELETE /api/responsaveis/:id
GET    /api/responsaveis/empresa/:id

Documentos
GET    /api/documentos
GET    /api/documentos/:id
POST   /api/documentos
PUT    /api/documentos/:id
DELETE /api/documentos/:id
GET    /api/documentos/empresa/:id
GET    /api/documentos/vencidos
GET    /api/documentos/proximos

Arquivos
GET    /api/documentos/:id/download

Dashboard
GET    /api/dashboard/stats

📦 8. Deploy
8.1 Railway – Backend

Serviço Node

Serviço MySQL

Variáveis de ambiente

Arquivo railway.toml:

[build]
builder = "nixpacks"
buildCommand = "npm install"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

8.2 Vercel – Frontend

Configuração atual (proxy):

{
  "version": 2,
  "builds": [
    { "src": "frontend/public/**/*", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "https://gestao-documental-production.up.railway.app/api/$1" },
    { "src": "/(.*)", "dest": "/frontend/public/$1" }
  ]
}

🔒 9. Segurança
Implementado

.env protegido

Validação de arquivos

Limite 10MB

SQL Injection protegido (prepared statements)

Sanitização de inputs

CORS configurado

Recomendado (Roadmap)

Autenticação JWT

Rate limiting

HTTPS obrigatório

Controle de permissões

Auditoria

Backup automático

🐛 10. Troubleshooting
Erro: Cannot connect to database

Validar .env

Verificar MySQL

Verificar porta

Upload não funciona

Verificar pasta /uploads/documentos/

Validar limite de arquivo

Frontend não carrega

Checar API_BASE em app.js

Abrir DevTools → Console

📊 11. Monitoramento

Logs do backend mostrados no terminal

Endpoint de saúde:

/api/health

🤝 12. Contribuição

Padronização:

ES6+

Indentação 4 espaços

Commits descritivos:

git commit -m "feat: adicionar filtro no dashboard"

📝 13. Licença

Projeto de uso interno. Todos os direitos reservados.

🔄 14. Histórico de Versões
v1.0.0

CRUDs completos

Dashboard

Upload de arquivos

Alertas de vencimento

API REST

Deploy Railway + Vercel

Roadmap

Autenticação JWT

Relatórios PDF

E-mail automático

App mobile
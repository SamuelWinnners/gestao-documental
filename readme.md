# gestao-documental
📋 Sistema de Gestão Documental e Controle de Vencimentos
Sistema web completo para gerenciamento de empresas, documentos e controle de vencimentos com alertas automáticos.

🚀 Funcionalidades
🏢 Gestão de Empresas - Cadastro completo de empresas

📄 Controle de Documentos - Controle de prazos e vencimentos

👥 Responsáveis - Gestão de responsáveis por setor (Fiscal, Contábil, DP)

📊 Dashboard - Visão geral com indicadores e alertas

⏰ Alertas Automáticos - Notificações para documentos próximos do vencimento

🔍 Busca e Filtros - Encontre rapidamente as informações

🛠️ Tecnologias
Frontend: HTML5, CSS3, JavaScript (ES6+), Bootstrap 5

Backend: Node.js, Express.js

Banco de Dados: MySQL

Outras: Chart.js, Font Awesome

📦 Instalação
Pré-requisitos
Node.js 14+

MySQL 5.7+

NPM ou Yarn

1. Clone o repositório
bash
git clone <url-do-repositorio>
cd sistema-gestao
2. Configuração do Banco de Dados
bash
# Conecte ao MySQL e execute:
mysql -u root -p < database.sql
3. Configuração do Backend
bash
cd backend

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações do MySQL
4. Arquivo .env
env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=gestao_documental
PORT=3000
NODE_ENV=development
5. Execute a aplicação
bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start
🌐 Acesso
Acesse a aplicação em: http://localhost:3000

📁 Estrutura do Projeto
text
sistema-gestao/
├── backend/
│   ├── app.js          # Servidor principal
│   ├── database.js     # Configuração do banco
│   ├── package.json
│   └── .env           # Variáveis de ambiente
├── frontend/
│   ├── index.html      # Aplicação frontend
│   ├── style.css       # Estilos principais
│   └── app.js          # Lógica do frontend
└── database.sql        # Estrutura do banco
🗃️ Estrutura do Banco de Dados
Tabelas Principais:
empresas - Dados cadastrais das empresas

documentos - Documentos com datas de vencimento

responsaveis - Responsáveis por setor

Relacionamentos completos com integridade referencial

🎯 Como Usar
1. Cadastro de Empresas
Acesse a página "Empresas"

Clique em "Nova Empresa"

Preencha os dados obrigatórios (Razão Social, CNPJ, Telefone, E-mail)

2. Cadastro de Documentos
Acesse a página "Documentos"

Clique em "Novo Documento"

Selecione a empresa, tipo do documento e datas

O sistema calcula automaticamente o status

3. Monitoramento
Acesse o "Dashboard" para ver o panorama geral

Documentos são classificados automaticamente:

🟢 Regular - Mais de 30 dias para vencer

🟡 Próximo - Vence em até 30 dias

🔴 Vencido - Data de vencimento passada

🔧 Desenvolvimento
Scripts Disponíveis
bash
npm start      # Inicia em produção
npm run dev    # Inicia em desenvolvimento com auto-reload
API Endpoints
GET /api/health - Status da API

GET /api/dashboard - Dados do dashboard

GET /api/empresas - Listar empresas

POST /api/empresas - Criar empresa

GET /api/documentos - Listar documentos

POST /api/documentos - Criar documento

🐛 Solução de Problemas
Erro de Conexão com o Banco
Verifique se o MySQL está rodando

Confirme as credenciais no arquivo .env

Execute o script database.sql

Erro 404 nas APIs
Certifique-se de que o backend está rodando na porta 3000

Acesse sempre por http://localhost:3000

Páginas Não Carregam
Verifique o console do navegador (F12)

Confirme se todas as rotas API estão respondendo

📈 Próximas Funcionalidades
Upload de arquivos (documentos digitalizados)

Sistema de notificações por e-mail

Relatórios em PDF

Múltiplos usuários com perfis

Integração com APIs governamentais

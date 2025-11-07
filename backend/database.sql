DROP DATABASE railway;
CREATE DATABASE railway;
USE railway;
-- Tabela de empresas
CREATE TABLE IF NOT EXISTS empresas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    telefone VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL,
    endereco TEXT,
    login_municipal VARCHAR(100),
    senha_municipal VARCHAR(100),
    login_estadual VARCHAR(100),
    senha_estadual VARCHAR(100),
    simples_nacional BOOLEAN DEFAULT FALSE,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de responsáveis
CREATE TABLE IF NOT EXISTS responsaveis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    funcao VARCHAR(100) NOT NULL,
    empresa_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT -- ✅ MUDADO: CASCADE → RESTRICT
);

-- Tabela de documentos
CREATE TABLE IF NOT EXISTS documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    empresa_id INT NOT NULL,
    responsavel_id INT NOT NULL,
    data_emissao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    observacoes TEXT,
    arquivo_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status_geral ENUM('pendente', 'em_andamento', 'concluido', 'cancelado') DEFAULT 'pendente',
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT, -- ✅ MUDADO: CASCADE → RESTRICT
    FOREIGN KEY (responsavel_id) REFERENCES responsaveis(id) ON DELETE RESTRICT -- ✅ MUDADO: CASCADE → RESTRICT
);

-- Tabela para acompanhamento do andamento dos documentos
CREATE TABLE IF NOT EXISTS documento_andamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    documento_id INT NOT NULL,
    responsavel_id INT NOT NULL,
    descricao TEXT NOT NULL,
    status ENUM('pendente', 'em_andamento', 'concluido', 'cancelado') DEFAULT 'em_andamento',
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE, -- ✅ MANTIDO (seguro)
    FOREIGN KEY (responsavel_id) REFERENCES responsaveis(id) ON DELETE RESTRICT -- ✅ MUDADO: CASCADE → RESTRICT
);

-- Adicionar índices para melhor performance
CREATE INDEX idx_documento_andamentos_documento_id ON documento_andamentos(documento_id);

-- Dados de exemplo para empresas
INSERT IGNORE INTO empresas (id, razao_social, nome_fantasia, cnpj, telefone, email, endereco) VALUES
(1, 'Empresa XYZ Ltda', 'XYZ Comércio', '12.345.678/0001-90', '(11) 9999-8888', 'contato@xyz.com', 'Rua das Flores, 123 - São Paulo/SP'),
(2, 'Comércio ABC S/A', 'ABC Store', '98.765.432/0001-10', '(11) 7777-6666', 'vendas@abcstore.com', 'Av. Principal, 456 - Rio de Janeiro/RJ'),
(3, 'Indústria Master Ltda', 'Master Ind', '11.222.333/0001-44', '(11) 5555-4444', 'admin@masterind.com', 'Rua Industrial, 789 - Campinas/SP');

-- Dados de exemplo para responsáveis
INSERT IGNORE INTO responsaveis (id, nome, email, telefone, funcao, empresa_id) VALUES
(1, 'João Silva', 'joao.silva@xyz.com', '(11) 98888-7777', 'Gerente Fiscal', 1),
(2, 'Maria Santos', 'maria.santos@abcstore.com', '(11) 97777-6666', 'Coordenadora Contábil', 2),
(3, 'Pedro Oliveira', 'pedro.oliveira@masterind.com', '(11) 96666-5555', 'Analista Fiscal', 3),
(4, 'Ana Costa', 'ana.costa@xyz.com', '(11) 95555-4444', 'Assistente Administrativo', 1);

-- Dados de exemplo para documentos
INSERT IGNORE INTO documentos (id, nome, tipo, empresa_id, responsavel_id, data_emissao, data_vencimento, observacoes, status_geral) VALUES
(1, 'Alvará de Funcionamento', 'Alvará', 1, 1, '2024-01-15', '2024-12-31', 'Alvará para atividades comerciais', 'concluido'),
(2, 'Certidão Negativa de Débitos', 'Certidão', 2, 2, '2024-01-20', '2024-06-30', 'Certidão federal, estadual e municipal', 'pendente'),
(3, 'Licença Ambiental', 'Licença', 3, 3, '2024-01-10', '2024-03-15', 'Licença de operação CETESB', 'em_andamento'),
(4, 'Contrato de Prestação de Serviços', 'Contrato', 1, 4, '2024-02-01', '2024-12-31', 'Contrato com empresa de TI', 'concluido'),
(5, 'Certidão Trabalhista', 'Certidão', 2, 2, '2024-02-05', '2024-08-05', 'Certidão negativa trabalhista', 'concluido');

-- Dados de exemplo para andamentos
INSERT IGNORE INTO documento_andamentos (id, documento_id, responsavel_id, descricao, status, data_criacao) VALUES
(1, 1, 1, 'Documento enviado para análise do setor fiscal', 'em_andamento', '2024-01-15 09:00:00'),
(2, 1, 2, 'Aguardando retorno do cliente com informações complementares', 'pendente', '2024-01-16 14:30:00'),
(3, 1, 1, 'Documento aprovado pela prefeitura municipal', 'concluido', '2024-01-20 11:15:00'),
(4, 2, 2, 'Certidões federais e estaduais emitidas com sucesso', 'em_andamento', '2024-01-21 10:00:00'),
(5, 2, 3, 'Aguardando certidão municipal - sistema offline', 'pendente', '2024-01-22 16:45:00'),
(6, 3, 3, 'Licença ambiental em análise pela CETESB', 'em_andamento', '2024-01-12 08:30:00'),
(7, 3, 1, 'Documentação complementar enviada', 'em_andamento', '2024-01-18 15:20:00'),
(8, 4, 4, 'Contrato revisado pelo departamento jurídico', 'concluido', '2024-02-02 09:45:00'),
(9, 5, 2, 'Certidão trabalhista emitida com sucesso', 'concluido', '2024-02-06 11:30:00');
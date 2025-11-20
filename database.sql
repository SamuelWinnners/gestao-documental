-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS gestao_documental;
USE gestao_documental;

-- Tabela de empresas
CREATE TABLE IF NOT EXISTS empresas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    endereco TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
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
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY (responsavel_id) REFERENCES responsaveis(id) ON DELETE CASCADE
);

-- Dados de exemplo
INSERT IGNORE INTO empresas (id, razao_social, nome_fantasia, cnpj, telefone, email, endereco) VALUES
(1, 'Empresa XYZ Ltda', 'XYZ Comércio', '12.345.678/0001-90', '(11) 9999-8888', 'contato@xyz.com', 'Rua das Flores, 123 - São Paulo/SP'),
(2, 'Comércio ABC S/A', 'ABC Store', '98.765.432/0001-10', '(11) 7777-6666', 'vendas@abcstore.com', 'Av. Principal, 456 - Rio de Janeiro/RJ'),
(3, 'Indústria Master Ltda', 'Master Ind', '11.222.333/0001-44', '(11) 5555-4444', 'admin@masterind.com', 'Rua Industrial, 789 - Campinas/SP');

INSERT IGNORE INTO responsaveis (id, nome, email, telefone, funcao, empresa_id) VALUES
(1, 'João Silva', 'joao.silva@xyz.com', '(11) 98888-7777', 'Gerente Fiscal', 1),
(2, 'Maria Santos', 'maria.santos@abcstore.com', '(11) 97777-6666', 'Coordenadora Contábil', 2),
(3, 'Pedro Oliveira', 'pedro.oliveira@masterind.com', '(11) 96666-5555', 'Analista Fiscal', 3),
(4, 'Ana Costa', 'ana.costa@xyz.com', '(11) 95555-4444', 'Assistente Administrativo', 1);

INSERT IGNORE INTO documentos (id, nome, tipo, empresa_id, responsavel_id, data_emissao, data_vencimento, observacoes) VALUES
(1, 'Alvará de Funcionamento', 'Alvará', 1, 1, '2024-01-15', '2024-12-31', 'Alvará para atividades comerciais'),
(2, 'Certidão Negativa de Débitos', 'Certidão', 2, 2, '2024-01-20', '2024-06-30', 'Certidão federal, estadual e municipal'),
(3, 'Licença Ambiental', 'Licença', 3, 3, '2024-01-10', '2024-03-15', 'Licença de operação CETESB'),
(4, 'Contrato de Prestação de Serviços', 'Contrato', 1, 4, '2024-02-01', '2024-12-31', 'Contrato com empresa de TI'),
(5, 'Certidão Trabalhista', 'Certidão', 2, 2, '2024-02-05', '2024-08-05', 'Certidão negativa trabalhista');
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
    funcao ENUM('Fiscal', 'Contábil', 'Departamento Pessoal') NOT NULL,
    empresa_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);

-- Tabela de documentos
CREATE TABLE IF NOT EXISTS documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo ENUM('Alvará', 'Certidão', 'Licença', 'Contrato', 'Outros') NOT NULL,
    empresa_id INT NOT NULL,
    responsavel_id INT NOT NULL,
    data_emissao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    observacoes TEXT,
    arquivo_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY (responsavel_id) REFERENCES responsaveis(id) ON DELETE CASCADE
);

-- Dados de exemplo
INSERT IGNORE INTO empresas (id, razao_social, nome_fantasia, cnpj, telefone, email) VALUES
(1, 'Empresa XYZ Ltda', 'XYZ Comércio', '12.345.678/0001-90', '(11) 9999-8888', 'contato@xyz.com'),
(2, 'Comércio ABC S/A', 'ABC Store', '98.765.432/0001-10', '(11) 7777-6666', 'vendas@abcstore.com');

INSERT IGNORE INTO responsaveis (id, nome, email, telefone, funcao, empresa_id) VALUES
(1, 'João Silva', 'joao.silva@xyz.com', '(11) 98888-7777', 'Fiscal', 1),
(2, 'Maria Santos', 'maria.santos@abcstore.com', '(11) 97777-6666', 'Contábil', 2);

INSERT IGNORE INTO documentos (id, nome, tipo, empresa_id, responsavel_id, data_emissao, data_vencimento) VALUES
(1, 'Alvará de Funcionamento', 'Alvará', 1, 1, '2024-01-15', '2024-12-31'),
(2, 'Certidão Negativa', 'Certidão', 2, 2, '2024-01-20', '2024-06-30'),
(3, 'Licença Ambiental', 'Licença', 1, 1, '2024-01-10', '2024-03-15');

select * from empresas;
select * from documentos;
select * from responsaveis;

select razao_social, cnpj from empresas where id = 5;

  SELECT d.*, e.razao_social as empresa_nome 
            FROM documentos d 
            LEFT JOIN empresas e ON d.empresa_id = e.id 
            WHERE d.data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            ORDER BY d.data_vencimento ASC
            LIMIT 10;
            
drop database gestao_documental;         
            
        
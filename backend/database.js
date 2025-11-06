// backend/database.js
import mysql from 'mysql2/promise';

// Configuração do banco de dados usando variáveis de ambiente
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '40028922',
    database: process.env.DB_NAME || 'gestao_documental',
    port: process.env.DB_PORT || 3306, // porta padrão do MySQL local
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


// Testar conexão
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conectado ao banco de dados MySQL');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Erro ao conectar com o banco de dados:', error.message);
        return false;
    }
}

// Executar teste de conexão ao iniciar
testConnection();

export default pool;
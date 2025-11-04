// backend/database.js
import mysql from 'mysql2/promise';

// Configuração do banco de dados
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '40028922',
    database: 'gestao_documental',
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
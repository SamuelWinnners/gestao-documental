import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Testando conexão
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Conectado ao banco de dados MySQL!');
    conn.release();
  } catch (err) {
    console.error('❌ Erro ao conectar no MySQL:', err);
  }
})();

export default pool;

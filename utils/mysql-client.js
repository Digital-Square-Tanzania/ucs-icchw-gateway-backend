// src/utils/mysql-client.js
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

class MySQLClient {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async query(sql, params = []) {
    try {
      const [rows] = await this.pool.query(sql, params);
      return rows;
    } catch (error) {
      console.error("❌ MySQL Query Error:", error);
      throw error;
    }
  }

  async execute(sql, params = []) {
    try {
      const [result] = await this.pool.execute(sql, params);
      return result;
    } catch (error) {
      console.error("❌ MySQL Execute Error:", error);
      throw error;
    }
  }

  async getConnection() {
    try {
      return await this.pool.getConnection();
    } catch (error) {
      console.error("❌ MySQL GetConnection Error:", error);
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

const mysqlClient = new MySQLClient();

export default mysqlClient;

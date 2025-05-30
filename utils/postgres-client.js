import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

class PostgresClient {
  constructor() {
    this.pool = new Pool({
      // connectionString: process.env.OPENSRP_DB_URL,
      host: process.env.PG_HOST,
      port: parseInt(process.env.PG_PORT, 10) || 5432,
      database: process.env.PG_DATABASE || "opensrp",
      user: process.env.PG_USER || "postgres",
      password: process.env.PG_PASSWORD,
      ssl: process.env.PG_SSL === "false",
      schema: process.env.PG_SCHEMA || "public",
    });
  }

  async query(sql, params = []) {
    try {
      const { rows } = await this.pool.query(sql, params);
      return rows;
    } catch (error) {
      console.error("❌ Postgres Query Error:", error.message);
      throw error;
    }
  }

  async getClient() {
    try {
      return await this.pool.connect();
    } catch (error) {
      console.error("❌ Postgres GetClient Error:", error.message);
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

const postgresClient = new PostgresClient();

export default postgresClient;

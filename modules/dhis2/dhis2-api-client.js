import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

class DHIS2ApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.DHIS2_API_URL,
      auth: {
        username: process.env.DHIS2_USERNAME,
        password: process.env.DHIS2_PASSWORD,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async get(endpoint, params = {}) {
    try {
      const response = await this.client.get(endpoint, { params });
      return response.data;
    } catch (error) {
      console.error(`❌ DHIS2 GET Error (${endpoint}):`, error.message);
      throw new Error(`Failed to fetch data from DHIS2 (${endpoint})`);
    }
  }

  async post(endpoint, data) {
    try {
      const response = await this.client.post(endpoint, data);
      return response.data;
    } catch (error) {
      console.error(`❌ DHIS2 POST Error (${endpoint}):`, error.message);
      throw new Error(`Failed to send data to DHIS2 (${endpoint})`);
    }
  }
}

export default new DHIS2ApiClient();

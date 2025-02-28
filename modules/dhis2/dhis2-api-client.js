import axios from "axios";
import dotenv from "dotenv";
import DHIS2UserRepository from "./user/dhis2-user-repository.js";

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

  async delete(endpoint) {
    try {
      const response = await this.client.delete(endpoint); // ✅ Await DELETE request
      console.log(`✅ DHIS2 DELETE Response (${endpoint}):`, response.data); // ✅ Log response

      if (response?.data?.response.uid) {
        await DHIS2UserRepository.deleteUser(response.data.response.uid); // ✅ Remove from local DB
        console.log(`✅ User with UUID ${response.data.response.uid} deleted from DHIS2 and local DB.`);
      } else {
        console.log(`⚠️ No UID returned from DHIS2, user might still exist.`);
      }

      return "Deleted successfully"; // ✅ Return confirmation
    } catch (error) {
      console.error(`❌ DHIS2 DELETE Error (${endpoint}):`, error.message);
      throw new Error(`Failed to delete data from DHIS2 (${endpoint})`);
    }
  }
}

export default new DHIS2ApiClient();

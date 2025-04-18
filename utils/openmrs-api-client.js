import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

class OpenMRSApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.OPENMRS_API_URL,
      auth: {
        username: process.env.OPENMRS_API_USERNAME,
        password: process.env.OPENMRS_API_PASSWORD,
      },
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
      },
    });
  }

  // GET request with optional query parameters
  async get(endpoint, params = {}) {
    try {
      const response = await this.client.get(endpoint, { params });
      return response.data;
    } catch (error) {
      console.error(`❌ OpenMRS GET Error (${endpoint}):`, error.response?.data.error || error);
      return error;
    }
  }

  // POST request to send data
  async post(endpoint, data) {
    try {
      const response = await this.client.post(endpoint, data);
      return response.data;
    } catch (error) {
      // console.error(`❌ OpenMRS POST Error (${endpoint}):`, error.response?.data || error.message);
      console.error(`❌ OpenMRS POST Error (${endpoint}): `, error.message);
      return error;
    }
  }

  // POST request to send data with full response
  async postReturningRawResponse(endpoint, data) {
    try {
      const response = await this.client.post(endpoint, data);
      return response;
    } catch (error) {
      console.error(`❌ OpenMRS POST Error (${endpoint}):`, error.response?.data || error.message);
      return error;
    }
  }

  // PUT request to update data
  async put(endpoint, data) {
    try {
      const response = await this.client.put(endpoint, data);
      return response.data;
    } catch (error) {
      console.error(`❌ OpenMRS PUT Error (${endpoint}):`, error.response?.data || error.message);
      return error;
    }
  }

  // DELETE request to remove data (Now fully generic)
  async delete(endpoint) {
    try {
      const response = await this.client.delete(endpoint);
      return response.data || "Deleted successfully";
    } catch (error) {
      console.error(`❌ OpenMRS DELETE Error (${endpoint}):`, error.response?.data || error.message);
      return error;
    }
  }
}

export default new OpenMRSApiClient();

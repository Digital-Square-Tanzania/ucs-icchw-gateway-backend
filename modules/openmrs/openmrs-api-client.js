import axios from "axios";
import dotenv from "dotenv";
import CustomError from "../../utils/custom-error.js";
import ApiError from "../../utils/api-error.js";

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

  /**
   * GET request with optional query parameters
   */
  async get(endpoint, params = {}) {
    try {
      const response = await this.client.get(endpoint, { params });
      return response.data;
    } catch (error) {
      console.error(`❌ OpenMRS GET Error (${endpoint}):`, error.response?.data || error.message);
      throw new CustomError(`❌ Failed to fetch data from OpenMRS (${endpoint})` + error.response?.data.error.message || error.message);
    }
  }

  /**
   * POST request to send data
   */
  async post(endpoint, data) {
    try {
      const response = await this.client.post(endpoint, data);
      return response.data;
    } catch (error) {
      console.error(`❌ OpenMRS POST Error (${endpoint}):`, error.response?.data || error.message);
      throw new ApiError(error.response?.data.error.message || error.message, 400, 3);
    }
  }

  /**
   * POST request to send data with full response
   */
  async postReturningRawResponse(endpoint, data) {
    try {
      const response = await this.client.post(endpoint, data);
      return response;
    } catch (error) {
      console.error(`❌ OpenMRS POST Error (${endpoint}):`, error.response?.data || error.message);
      throw new ApiError(error.response?.data.error.message || error.message, 400, 3);
    }
  }

  /**
   * PUT request to update data
   */
  async put(endpoint, data) {
    try {
      const response = await this.client.put(endpoint, data);
      return response.data;
    } catch (error) {
      console.error(`❌ OpenMRS PUT Error (${endpoint}):`, error.response?.data || error.message);
      throw new CustomError(`Failed to update data on OpenMRS (${endpoint}): ${error.response?.data.error.message || error.message}`);
    }
  }

  /**
   * DELETE request to remove data (Now fully generic)
   */
  async delete(endpoint) {
    try {
      const response = await this.client.delete(endpoint);
      return response.data || "Deleted successfully"; // Returns server response
    } catch (error) {
      console.error(`❌ OpenMRS DELETE Error (${endpoint}):`, error.response?.data || error.message);
      throw new CustomError(`Failed to delete data from OpenMRS (${endpoint})`);
    }
  }
}

export default new OpenMRSApiClient();

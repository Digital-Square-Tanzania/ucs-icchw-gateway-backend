import axios from "axios";
import dotenv from "dotenv";
import CustomError from "../../utils/custom-error.js";

dotenv.config();

class OpenSRPApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.OPENSRP_API_URL,
      auth: {
        username: process.env.OPENSRP_API_USERNAME,
        password: process.env.OPENSRP_API_PASSWORD,
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
      console.error(`❌ OpenSRP GET Error (${endpoint}):`, error.response?.data || error.message);
      throw new CustomError(`❌ Failed to fetch data from OpenSRP (${endpoint})` + error.response?.data || error.message);
    }
  }

  /**
   * POST request to send data
   */
  async post(endpoint, data) {
    try {
      const response = await this.client.post(endpoint, data);

      if (!response.data) {
        throw new CustomError("Resource is not available", 404);
      }
      return response.data;
    } catch (error) {
      console.error(`❌ OpenSRP POST Error (${endpoint}):`, error.message);
      throw new CustomError(error.message, error.status);
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
      console.error(`❌ OpenSRP PUT Error (${endpoint}):`, error.response?.data || error.message);
      throw new CustomError(`Failed to update data on OpenSRP (${endpoint}): ` + (error.response?.data || error.message), 401);
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
      console.error(`❌ OpenSRP DELETE Error (${endpoint}):`, error.response?.data || error.message);
      throw new CustomError(`Failed to delete data from OpenSRP (${endpoint}): ` + (error.response?.data || error.message));
    }
  }
}

export default new OpenSRPApiClient();

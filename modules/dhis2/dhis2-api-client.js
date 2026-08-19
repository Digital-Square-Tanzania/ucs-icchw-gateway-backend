import axios from "axios";
import dotenv from "dotenv";
import qs from "qs";

dotenv.config();

function normalizeDhis2ApiUrl(url) {
  if (!url) return url;
  return url.replace(/\/+$/, "");
}

function buildRequestUrl(baseURL, endpoint) {
  const base = normalizeDhis2ApiUrl(baseURL || "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

function formatDhis2Error(error, endpoint) {
  const status = error.response?.status;
  const requestUrl = buildRequestUrl(error.config?.baseURL || process.env.DHIS2_API_URL, error.config?.url || endpoint);
  const responseBody = error.response?.data;
  const responseHint =
    typeof responseBody === "string" && responseBody.includes("HTTP Status 404")
      ? "Tomcat returned 404 — check DHIS2_API_URL (often .../dhis/api or .../api)"
      : typeof responseBody === "object"
        ? JSON.stringify(responseBody)
        : responseBody || error.message;

  return { status, requestUrl, responseHint };
}

class DHIS2ApiClient {
  constructor() {
    const baseURL = normalizeDhis2ApiUrl(process.env.DHIS2_API_URL);
    if (!baseURL) {
      console.warn("⚠️ DHIS2_API_URL is not set — DHIS2 sync requests will fail.");
    } else if (!baseURL.endsWith("/api")) {
      console.warn(`⚠️ DHIS2_API_URL (${baseURL}) does not end with /api — verify it matches your DHIS2 deployment path.`);
    }

    this.client = axios.create({
      baseURL,
      auth: {
        username: process.env.DHIS2_USERNAME,
        password: process.env.DHIS2_PASSWORD,
      },
      headers: {
        "Content-Type": "application/json",
      },
      paramsSerializer: (params) => qs.stringify(params, { arrayFormat: "brackets" }),
    });
  }

  /**
   * GET request with query parameters
   */
  async get(endpoint, params = {}) {
    try {
      const response = await this.client.get(endpoint, { params });
      return response.data;
    } catch (error) {
      const { status, requestUrl, responseHint } = formatDhis2Error(error, endpoint);
      console.error(`❌ DHIS2 GET Error (${status || "network"} ${requestUrl}):`, responseHint);
      throw new Error(`Failed to fetch data from DHIS2 (${requestUrl})`);
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
      const { status, requestUrl, responseHint } = formatDhis2Error(error, endpoint);
      console.error(`❌ DHIS2 POST Error (${status || "network"} ${requestUrl}):`, responseHint);
      throw new Error(`Failed to send data to DHIS2 (${requestUrl})`);
    }
  }

  /**
   * DELETE request to remove any entity
   */
  async delete(endpoint) {
    try {
      const response = await this.client.delete(endpoint);
      return response.data;
    } catch (error) {
      const { status, requestUrl, responseHint } = formatDhis2Error(error, endpoint);
      console.error(`❌ DHIS2 DELETE Error (${status || "network"} ${requestUrl}):`, responseHint);
      throw new Error(`Failed to delete data from DHIS2 (${requestUrl})`);
    }
  }
}

export default new DHIS2ApiClient();

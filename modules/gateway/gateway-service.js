import CustomError from "../../utils/custom-error.js";
import GatewayRepository from "./gateway-repository.js";
import openSRPApiClient from "../gateway/opensrp-api-client.js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

class GatewayService {
  static async getTeamMemberByLocationHfrCode(hfrCode) {
    return await GatewayRepository.getTeamMembersByLocationHfrCode(hfrCode);
  }

  static async getStatuses(month, year, teamMembers) {
    try {
      const payload = {};
      // Fetch team member statys from OpenSRP
      const opensrpRequestPyload = {
        period: {
          month: month,
          year: year,
        },
        chws: teamMembers,
      };
      console.log("Making request to OpenSRP API with payload:", opensrpRequestPyload);
      const chwMonthlyStatusResponse = await axios.post("http://170.187.199.69:9400/chw/monthly-status", opensrpRequestPyload, {
        auth: {
          username: process.env.OPENSRP_API_USERNAME,
          password: process.env.OPENSRP_API_PASSWORD,
        },
      });
      console.log("Request headers:", chwMonthlyStatusResponse.config.headers);

      payload.statuses = chwMonthlyStatusResponse.data;
      payload.messageId = await this.generateMessageId();
      return payload;
    } catch (error) {
      throw new CustomError(error.message, 500);
    }
  }

  static async generateMessageId() {
    const now = new Date();

    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");

    const HH = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const SSS = String(now.getMilliseconds()).padStart(3, "0");

    return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}${SSS}`;
  }

  static async getChwMonthlyStatus(req, res, next) {
    const { header, body } = req.body.message;
    const signature = req.body.signature;
    const hfrCode = body.FacilityCode;
    const teamMembers = await this.getTeamMemberByLocationHfrCode(hfrCode);

    if (!teamMembers) {
      throw new CustomError("CHW monthly activity statistics not found.", 404);
    }

    const month = body.month;
    const year = body.year;

    console.log("-> Getting monthly status for team members: ");
    const payload = await this.getStatuses(month, year, teamMembers);
    const responseHeader = {};
    responseHeader.sender = header.receiver;
    responseHeader.receiver = header.sender;
    responseHeader.messageType = header.messageType.endsWith("_REQUEST") ? header.messageType.replace("_REQUEST", "_RESPONSE") : header.messageType;
    responseHeader.messageId = payload.messageId;
    responseHeader.createdAt = new Date().toISOString();
    const responseObject = {};
    responseObject.header = responseHeader;
    responseObject.body = payload.statuses;
    responseObject.signature = signature;
    console.log("Statuses obtained and sent: ==>");
    return responseObject;
  }
}

export default GatewayService;

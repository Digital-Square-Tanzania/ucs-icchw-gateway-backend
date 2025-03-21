import CustomError from "../../utils/custom-error.js";
import GatewayRepository from "./gateway-repository.js";
import openSRPApiClient from "../gateway/opensrp-api-client.js";
import dotenv from "dotenv";
import Joi from "joi";

dotenv.config();

class GatewayService {
  static async getTeamMemberByLocationHfrCode(hfrCode) {
    return await GatewayRepository.getTeamMembersByLocationHfrCode(hfrCode);
  }

  static async getStatuses(month, year, teamMembers) {
    try {
      const payload = {};

      // Validate month and year
      const schema = Joi.object({
        month: Joi.number().min(1).max(12).required(),
        year: Joi.number().max(new Date().getFullYear()).required(),
      });
      const { error } = schema.validate({ month, year });
      if (error) {
        throw new CustomError(`Validation error: ${error.message}`, 400);
      }

      // Prepare payload for OpenSRP request
      const opensrpRequestPyload = {
        period: {
          month: month,
          year: year,
        },
        chws: teamMembers,
      };

      // Fetch team member statys from OpenSRP
      const chwMonthlyStatusResponse = await openSRPApiClient.post("/chw/monthly-status", opensrpRequestPyload);

      if (chwMonthlyStatusResponse.length === 0) {
        throw new CustomError("CHW monthly activity statistics not found.", 404);
      }

      payload.statuses = chwMonthlyStatusResponse;
      payload.messageId = await this.generateMessageId();
      return payload;
    } catch (error) {
      throw new CustomError(error.message, error.statusCode);
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

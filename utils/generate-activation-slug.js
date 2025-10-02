import crypto from "crypto";
import prisma from "../config/prisma.js";
import CustomError from "./custom-error.js";

class GenerateActivationSlug {
  constructor() {}

  static async generate(userUuid, payload, newTeamMember, type, length) {
    try {
      const slug = crypto.randomBytes(length).toString("base64url");
      await prisma.accountActivation.create({
        data: {
          userUuid,
          slug,
          expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10), // 10 days from now, updated from 3
          slugType: type,
          email: payload.email || null,
          nin: payload.nin || null,
          fullName: payload.firstName && payload.lastName ? `${payload.firstName} ${payload.lastName}` : null,
          phoneNumber: payload.phoneNumber || null,
          locationCode: payload.locationCode || null,
          facility: newTeamMember.locationName || null,
        },
      });
      return slug;
    } catch (error) {
      console.log(error);
      throw new CustomError("Error while generating activation slug" + error.message, 500);
    }
  }
}

export default GenerateActivationSlug;

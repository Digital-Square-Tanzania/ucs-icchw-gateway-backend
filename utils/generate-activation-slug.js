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
          email: payload.message.body[0].email || null,
          nin: payload.message.body[0].NIN || null,
          fullName: payload.message.body[0].firstName && payload.message.body[0].lastName ? `${payload.message.body[0].firstName} ${payload.message.body[0].lastName}` : null,
          phoneNumber: payload.message.body[0].phoneNumber || null,
          locationCode: payload.message.body[0].locationCode || null,
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

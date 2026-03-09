import crypto from "crypto";
import prisma from "../config/prisma.js";
import CustomError from "./custom-error.js";

class GenerateActivationSlug {
  constructor() {}

  static async generate(userUuid, payload, newTeamMember, type, length) {
    try {
      // Support both legacy HRHIS-style payloads (payload.message.body[0])
      // and simpler flat payload objects ({ email, nin, firstName, ... }).
      const body =
        payload &&
        payload.message &&
        Array.isArray(payload.message.body) &&
        payload.message.body[0]
          ? payload.message.body[0]
          : payload || {};

      const email = body.email || null;
      const nin = body.NIN || body.nin || null;
      const firstName = body.firstName || null;
      const lastName = body.lastName || null;
      const fullName =
        firstName && lastName ? `${firstName} ${lastName}` : null;
      const phoneNumber = body.phoneNumber || null;
      const locationCode = body.locationCode || null;

      const slug = crypto.randomBytes(length).toString("base64url");
      await prisma.accountActivation.create({
        data: {
          userUuid,
          slug,
          expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10), // 10 days from now, updated from 3
          slugType: type,
          email,
          nin,
          fullName,
          phoneNumber,
          locationCode,
          facility: (newTeamMember && newTeamMember.locationName) || null,
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

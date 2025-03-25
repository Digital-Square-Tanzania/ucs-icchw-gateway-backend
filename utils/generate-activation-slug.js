import crypto from "crypto";
import prisma from "../config/prisma.js";
import CustomError from "./custom-error.js";

class GenerateActivationSlug {
  constructor() {}

  static async generate(userUuid, type, length) {
    try {
      const slug = crypto.randomBytes(length).toString("base64url");
      await prisma.accountActivation.create({
        data: {
          userUuid,
          slug,
          expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days from now
          slugType: type,
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

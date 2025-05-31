import fs from "fs";
import path from "path";
import crypto from "crypto";
import CustomError from "../utils/custom-error.js";

export class FfarsSignature {
  constructor() {
    const privateKeyPath = path.resolve("keys/private_key.pem");
    const publicKeyPath = path.resolve("keys/public_key.pem");
    const ffarsPublicKeyPath = path.resolve("keys/ffars_public_key.pem");

    try {
      this.privateKey = fs.readFileSync(privateKeyPath, "utf8");
      this.publicKey = fs.readFileSync(publicKeyPath, "utf8");
      this.ffarsPublicKey = fs.readFileSync(ffarsPublicKeyPath, "utf8");
    } catch (err) {
      throw new CustomError("Failed to load keys. Please ensure the key files exist and are accessible.", 500);
    }
  }

  signMessage(rawMessage) {
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(rawMessage);
    signer.end();
    return signer.sign(this.privateKey, "base64");
  }

  // Verifies a message signed by FFARS
  verifyMessageFromFfars(rawMessage, signature) {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(rawMessage);
    verifier.end();
    return verifier.verify(this.ffarsPublicKey, signature, "base64");
  }

  // Verifies a message signed by this system (UCS)
  verifyMessageFromUcs(rawMessage, signature) {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(rawMessage);
    verifier.end();
    return verifier.verify(this.publicKey, signature, "base64");
  }

  // Test UCS sign and UCS verify to confirm keys are valid
  test() {
    try {
      const message = JSON.stringify({
        body: "sample-body",
        header: "sample-header",
      });

      const signature = this.signMessage(message);
      const isVerified = this.verifyMessageFromUcs(message, signature);

      return {
        message,
        signature,
        verified: isVerified,
      };
    } catch (err) {
      return {
        error: err.message,
      };
    }
  }
}

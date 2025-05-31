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

  // Sign Message in UCS
  signMessage(messageObj) {
    const rawMessage = JSON.stringify(messageObj); // ensures deterministic string
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(rawMessage);
    signer.end();
    const signature = signer.sign(this.privateKey, "base64");
    console.log("Generated Signature:", signature);
    console.log("Message to be signed:", rawMessage);
    return signature;
  }

  // Verify Message From UCS
  verifyMessageFromUcs(messageObj, signature) {
    const rawMessage = JSON.stringify(messageObj); // again: stringify first
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(rawMessage);
    verifier.end();

    console.log("Verifying with public key:", this.publicKey);
    console.log("Signature:", signature);
    console.log("Raw message:", rawMessage);
    return verifier.verify(this.publicKey, signature, "base64");
  }

  // Verify Message From FFARS
  verifyMessageFromFfars(messageObj, signature) {
    const rawMessage = JSON.stringify(messageObj);
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(rawMessage);
    verifier.end();
    return verifier.verify(this.ffarsPublicKey, signature, "base64");
  }

  // Test UCS signing and verification
  test() {
    try {
      const message = JSON.stringify({
        body: "sample-body",
        header: "sample-header",
      });
      const signature = this.signMessage(message);
      const isVerified = this.verifyMessageFromUcs(message, signature);
      return isVerified;
    } catch (err) {
      return {
        error: err.message,
      };
    }
  }
}

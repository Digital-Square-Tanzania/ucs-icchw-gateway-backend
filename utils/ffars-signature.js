import fs from "fs";
import path from "path";
import crypto from "crypto";
import CustomError from "../utils/custom-error.js";

export class SignatureService {
  constructor() {
    const privateKeyPath = path.resolve("../keys/private_key.pem");
    const publicKeyPath = path.resolve("../keys/public_key.pem");
    const ffarsPublicKeyPath = path.resolve("../keys/ffars_public_key.pem");

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
    const signature = signer.sign(this.privateKey, "base64");
    return signature;
  }

  verifyMessage(rawMessage, signature) {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(rawMessage);
    verifier.end();
    const isVerified = verifier.verify(this.ffarsPublicKey, signature, "base64");
    return isVerified;
  }

  test(messageBody, messageHeader) {
    if (!messageBody || !messageHeader) {
      throw new CustomError("Both message body and header are required for signing.", 500);
    }
    const message = `{ 'body': ${messageBody}, 'header': ${messageHeader} }`;
    const signature = this.signMessage(message);
    const verified = this.verifyMessage(message, signature);
    return `message: ${message}\nsignature: ${signature}\nverified: ${verified}`;
  }
}

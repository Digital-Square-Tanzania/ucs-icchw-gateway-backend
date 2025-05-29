import fs from "fs";
import path from "path";
import crypto from "crypto";

export class SignatureService {
  constructor() {
    const privateKeyPath = path.resolve("../keys/private_key.pem");
    const publicKeyPath = path.resolve("../keys/public_key.pem");

    try {
      this.privateKey = fs.readFileSync(privateKeyPath, "utf8");
      this.publicKey = fs.readFileSync(publicKeyPath, "utf8");
    } catch (err) {
      throw new Error("Failed to load or read RSA keys: " + err.message);
    }
  }

  signMessage(rawData) {
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(rawData);
    signer.end();
    const signature = signer.sign(this.privateKey, "base64");
    return signature;
  }

  verifyMessage(rawData, signature) {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(rawData);
    verifier.end();
    const isVerified = verifier.verify(this.publicKey, signature, "base64");
    return isVerified;
  }

  test(messagebody, messageHeader) {
    if (!messagebody || !messageHeader) {
      throw new Error("Both message body and header are required for signing.");
    }
    const message = `{ 'body': ${messageBody}, 'header': ${messageHeader} }`;
    const signature = this.signMessage(message);
    const verified = this.verifyMessage(message, signature);
    return `message: ${message}\nsignature: ${signature}\nverified: ${verified}`;
  }
}

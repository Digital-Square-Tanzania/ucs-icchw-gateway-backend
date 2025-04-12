import nodemailer from "nodemailer";
import dotenv from "dotenv";
import CustomError from "../utils/custom-error.js";

dotenv.config();

class EmailService {
  constructor() {
    // Gmail transporter
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USERNAME, // your_email@gmail.com
        pass: process.env.EMAIL_PASSWORD, // App-specific password
      },
    });
  }

  /**
   * Send an email using Gmail
   * @param {Object} emailData
   * @param {string} emailData.to - Recipient email address
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.text - Plain text body (optional)
   * @param {string} emailData.html - HTML body (optional)
   */
  async sendEmail(emailData) {
    try {
      const { to, subject, text, html } = emailData;

      const mailOptions = {
        from: process.env.EMAIL_FROM || "iCCHW-WAJA",
        to,
        subject,
        text: text || "",
        html: html || "",
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("Email sent:", info.response);
      return info;
    } catch (error) {
      console.error("❌ Error sending email:", error.message);
      throw new CustomError("Failed to send email: " + error.message, 500);
    }
  }
}

export default new EmailService();

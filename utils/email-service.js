import nodemailer from "nodemailer";
import dotenv from "dotenv";
import axios from "axios";
import CustomError from "../utils/custom-error.js";

dotenv.config();

class EmailService {
  constructor() {
    this.emailProvider = process.env.EMAIL_PROVIDER || "gmail"; // "gmail" or "ega"
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (this.emailProvider === "gmail") {
      // Gmail transporter
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USERNAME, // your_email@gmail.com
          pass: process.env.EMAIL_PASSWORD, // App-specific password
        },
      });
    }
    // For eGA corporate email, we'll use their API directly
  }

  /**
   * Send email using eGA corporate email service
   * @param {Object} emailData
   * @param {string} emailData.to - Recipient email address
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.text - Plain text body (optional)
   * @param {string} emailData.html - HTML body (optional)
   */
  async sendEmailViaEGA(emailData) {
    try {
      const { to, subject, text, html } = emailData;

      // eGA API endpoint - YOU NEED TO GET THE ACTUAL URL FROM eGA
      // Contact eGA at info@ega.go.tz or +255 22 21 2996 for the correct API endpoint
      const egaApiUrl = process.env.EGA_API_URL;

      if (!egaApiUrl) {
        throw new CustomError("EGA_API_URL environment variable is required but not set. Please contact eGA for the correct API endpoint.", 500);
      }

      const payload = {
        senderID: process.env.EGA_SENDER_ID,
        systemID: process.env.EGA_SYSTEM_ID,
        apiKey: process.env.EGA_API_KEY,
        mobileServiceID: process.env.EGA_MOBILE_SERVICE_ID,
        emailAddress: process.env.EGA_EMAIL_ADDRESS,
        recipientEmail: to,
        subject: subject,
        message: html || text,
        messageType: html ? "html" : "text",
      };

      const response = await axios.post(egaApiUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.EGA_API_KEY}`,
        },
        timeout: 30000, // 30 seconds timeout
      });

      console.log(" > ✉️ eGA Email sent successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error sending email via eGA:", error.message);
      throw new CustomError("Failed to send email via eGA: " + error.message, 500);
    }
  }

  /**
   * Send email using Gmail
   * @param {Object} emailData
   * @param {string} emailData.to - Recipient email address
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.text - Plain text body (optional)
   * @param {string} emailData.html - HTML body (optional)
   */
  async sendEmailViaGmail(emailData) {
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
      console.log(" > ✉️ Gmail Email sent:", info.response);
      return info;
    } catch (error) {
      console.error("❌ Error sending email via Gmail:", error.message);
      throw new CustomError("Failed to send email via Gmail: " + error.message, 500);
    }
  }

  /**
   * Send an email using the configured provider (eGA or Gmail)
   * @param {Object} emailData
   * @param {string} emailData.to - Recipient email address
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.text - Plain text body (optional)
   * @param {string} emailData.html - HTML body (optional)
   */
  async sendEmail(emailData) {
    try {
      console.log(`📧 Sending email via ${this.emailProvider.toUpperCase()}...`);

      if (this.emailProvider === "ega") {
        return await this.sendEmailViaEGA(emailData);
      } else {
        return await this.sendEmailViaGmail(emailData);
      }
    } catch (error) {
      throw new CustomError("Failed to send email: " + error.message, 500);
    }
  }

  /**
   * Get current email provider
   * @returns {string} Current email provider
   */
  getCurrentProvider() {
    return this.emailProvider;
  }

  /**
   * Switch email provider (useful for testing or fallback)
   * @param {string} provider - "gmail" or "ega"
   */
  switchProvider(provider) {
    if (provider === "gmail" || provider === "ega") {
      this.emailProvider = provider;
      this.initializeTransporter();
      console.log(`📧 Email provider switched to: ${provider.toUpperCase()}`);
    } else {
      throw new CustomError("Invalid email provider. Use 'gmail' or 'ega'", 400);
    }
  }
}

export default new EmailService();

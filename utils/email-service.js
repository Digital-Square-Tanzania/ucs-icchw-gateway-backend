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

      // eGA SMTP configuration
      const egaSmtpHost = process.env.EGA_SMTP_HOST;
      const egaSmtpPort = process.env.EGA_SMTP_PORT || 587;
      const egaSmtpSecure = process.env.EGA_SMTP_SECURE === "true" || false;
      const egaEmail = process.env.EGA_EMAIL_ADDRESS;
      const egaPassword = process.env.EGA_EMAIL_PASSWORD;

      if (!egaSmtpHost || !egaEmail || !egaPassword) {
        throw new CustomError("EGA SMTP configuration is incomplete. Please check EGA_SMTP_HOST, EGA_EMAIL_ADDRESS, and EGA_EMAIL_PASSWORD environment variables.", 500);
      }

      // Create SMTP transporter for eGA
      const egaTransporter = nodemailer.createTransporter({
        host: egaSmtpHost,
        port: parseInt(egaSmtpPort),
        secure: egaSmtpSecure,
        auth: {
          user: egaEmail,
          pass: egaPassword,
        },
      });

      const mailOptions = {
        from: egaEmail,
        to,
        subject,
        text: text || "",
        html: html || "",
      };

      const info = await egaTransporter.sendMail(mailOptions);
      console.log(" > ✉️ eGA Email sent successfully:", info.response);
      return info;
    } catch (error) {
      // console.error("❌ Error sending email via eGA:", error.message);
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
      // console.error("❌ Error sending email via Gmail:", error.message);
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
      console.log(` SUB: Sending email via ${this.emailProvider.toUpperCase()}...`);

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

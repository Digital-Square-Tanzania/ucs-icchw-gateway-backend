import nodemailer from "nodemailer";
import dotenv from "dotenv";
import CustomError from "../utils/custom-error.js";

dotenv.config();

class EmailService {
  constructor() {
    // Determine the email provider from the environment variables
    this.emailProvider = process.env.EMAIL_PROVIDER || "gmail"; // "gmail" or "ega"
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (this.emailProvider === "gmail") {
      // Gmail transporter using the correct nodemailer function: createTransport
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USERNAME, // your_email@gmail.com
          pass: process.env.EMAIL_PASSWORD, // App-specific password
        },
      });
    }
    // For eGA corporate email, we'll use their API directly via a function call,
    // or set up a transporter if the provider is 'ega' at initialization,
    // though the current setup only initializes Gmail here.
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

      // --- Default eGA SMTP configuration ---
      let host = process.env.EGA_SMTP_HOST;
      let port = process.env.EGA_SMTP_PORT || 587;
      let secure = process.env.EGA_SMTP_SECURE === "true" || false;
      let authUser = process.env.EGA_EMAIL_ADDRESS;
      let authPass = process.env.EGA_EMAIL_PASSWORD;
      const egaDisplayName = process.env.EGA_EMAIL_DISPLAY_NAME || "UCS System";

      // New Properties to match Spring config (e.g., spring.mail.smtp.auth=false)
      const authRequired = process.env.EGA_SMTP_AUTH_REQUIRED !== "false"; // Default: true
      const requireTLS = process.env.EGA_SMTP_REQUIRE_TLS === "true"; // Default: false (Matches starttls.enable=true)

      // The email address that will appear in the 'From' header
      let senderEmailForFromHeader = authUser;

      // --- RELAY OVERRIDE LOGIC for using Google SMTP ---
      if (process.env.EGA_USE_GMAIL_RELAY === "true") {
        host = process.env.EMAIL_HOST || "smtp.gmail.com";
        port = parseInt(process.env.EMAIL_PORT) || 465;
        secure = process.env.EMAIL_SECURE === "true" || true;

        authUser = process.env.EMAIL_USERNAME;
        authPass = process.env.EMAIL_PASSWORD;
        senderEmailForFromHeader = authUser;
        console.warn("⚠️ EGA Provider using GMAIL RELAY for SMTP. Sender address is set to authenticated Gmail user.");
      }
      // --------------------------------------------------

      // Configuration validation
      if (!host || (authRequired && (!authUser || !authPass))) {
        throw new CustomError("SMTP configuration is incomplete. Please check host, email, and password environment variables, and the EGA_SMTP_AUTH_REQUIRED setting.", 500);
      }

      // Conditionally build authentication block (matches spring.mail.properties.mail.smtp.auth)
      const authConfig =
        authRequired && authUser && authPass
          ? {
              user: authUser,
              pass: authPass,
            }
          : undefined;

      // --- Transporter Configuration ---
      const transporterOptions = {
        host: host,
        port: parseInt(port),
        // secure: false is required for port 25 or 587 when using STARTTLS (ssl.enable=false)
        secure: secure,
        auth: authConfig,
        // requireTLS: true matches spring.mail.properties.mail.smtp.starttls.enable=true
        requireTLS: requireTLS,
        // tls: { rejectUnauthorized: false } matches ssl.trust=* and ssl.checkserveridentity=false
        tls: {
          rejectUnauthorized: false,
        },
      };

      const transporter = nodemailer.createTransport(transporterOptions);

      // The 'from' address uses the configured display name and the determined sender email
      const fromAddress = `${egaDisplayName} <${senderEmailForFromHeader}>`;

      const mailOptions = {
        from: fromAddress,
        to,
        subject,
        text: text || "",
        html: html || "",
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(" > ✉️ eGA Email sent successfully:", info.response);
      return info;
    } catch (error) {
      // Re-throwing the error with better context
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

      if (!this.transporter) {
        throw new CustomError("Gmail Transporter not initialized. Check EMAIL_PROVIDER setting.", 500);
      }

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
      throw new CustomError("Failed to send email via Gmail: " + error.message, 500);
    }
  }

  /**
   * Send an email using the configured provider (eGA or Gmail)
   * @param {Object} emailData
   * // ... (Rest of the method remains unchanged)
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
      // The CustomError from the specific provider method will bubble up here
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

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

      // eGA SMTP configuration — aligned with ucs-peers-gateway-backend (trim, strip quotes, correct types)
      const trimAndStripQuotes = (s) => (s || "").replace(/^["']|["']$/g, "").trim();
      let host = trimAndStripQuotes(process.env.EGA_SMTP_HOST);
      let port = Number(process.env.EGA_SMTP_PORT || 587);
      let secure = process.env.EGA_SMTP_SECURE === "true";
      let authUser = trimAndStripQuotes(process.env.EGA_EMAIL_ADDRESS);
      let authPass = trimAndStripQuotes(process.env.EGA_EMAIL_PASSWORD);
      const egaDisplayName = trimAndStripQuotes(process.env.EGA_EMAIL_DISPLAY_NAME) || "UCS System";

      const authRequired = process.env.EGA_SMTP_AUTH_REQUIRED !== "false";
      let requireTLS = process.env.EGA_SMTP_REQUIRE_TLS === "true";

      let senderEmailForFromHeader = authUser;

      if (process.env.EGA_USE_GMAIL_RELAY === "true") {
        host = (process.env.EMAIL_HOST || "smtp.gmail.com").trim();
        port = Number(process.env.EMAIL_PORT || 465);
        secure = process.env.EMAIL_SECURE !== "false";
        requireTLS = false;
        authUser = trimAndStripQuotes(process.env.EMAIL_USERNAME);
        authPass = trimAndStripQuotes(process.env.EMAIL_PASSWORD);
        senderEmailForFromHeader = authUser;
        console.warn("⚠️ EGA Provider using GMAIL RELAY for SMTP. Sender address is set to authenticated Gmail user.");
      }

      // Port 587: if secure is true, server expects STARTTLS so use secure=false to avoid "Greeting never received"
      // Port 25: use .env as-is (plain SMTP, no TLS) — do not override
      if (port === 587 && secure) {
        secure = false;
        if (!requireTLS) requireTLS = true;
        console.warn("[email-service] Port 587: using secure=false, requireTLS=true (STARTTLS).");
      }

      console.log("[email-service] eGA SMTP config:", { host, port, secure, requireTLS });

      if (!host || (authRequired && (!authUser || !authPass))) {
        throw new CustomError("SMTP configuration is incomplete. Check EGA_SMTP_HOST, EGA_EMAIL_ADDRESS, EGA_EMAIL_PASSWORD, and EGA_SMTP_AUTH_REQUIRED.", 500);
      }

      const authConfig =
        authRequired && authUser && authPass
          ? { user: authUser, pass: authPass }
          : undefined;

      const transporterOptions = {
        host,
        port,
        secure,
        auth: authConfig,
        requireTLS,
        tls: { rejectUnauthorized: false },
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
      const errorMessage = error?.message || "Unknown error";
      const code = error?.code;
      const response = error?.response;
      const responseCode = error?.responseCode;
      const command = error?.command;
      console.error("[email-service] eGA send error details:", {
        message: errorMessage,
        code,
        response,
        responseCode,
        command,
      });
      if (code === "EAUTH") {
        throw new CustomError("eGA authentication failed. Check EGA_EMAIL_ADDRESS and EGA_EMAIL_PASSWORD in .env.", 500);
      }
      if (code === "ECONNECTION") {
        throw new CustomError(`eGA connection failed to ${process.env.EGA_SMTP_HOST}:${process.env.EGA_SMTP_PORT}. Check network and EGA_SMTP_HOST/EGA_SMTP_PORT.`, 500);
      }
      throw new CustomError("Failed to send email via eGA: " + errorMessage, 500);
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
   * Send an email using the configured provider (eGA or Gmail).
   * When provider is eGA and eGA fails (e.g. "Greeting never received"), automatically
   * tries Gmail if EMAIL_USERNAME and EMAIL_PASSWORD are set (same as ucs-peers-gateway-backend).
   */
  async sendEmail(emailData) {
    try {
      console.log(` SUB: Sending email via ${this.emailProvider.toUpperCase()}...`);

      if (this.emailProvider === "ega") {
        try {
          return await this.sendEmailViaEGA(emailData);
        } catch (egaError) {
          const gmailUser = process.env.EMAIL_USERNAME;
          const gmailPass = process.env.EMAIL_PASSWORD;
          if (gmailUser && gmailPass) {
            console.warn("[email-service] eGA email failed, attempting Gmail fallback:", egaError?.message || egaError);
            try {
              const gmailTransporter = nodemailer.createTransport({
                service: "gmail",
                auth: { user: gmailUser, pass: gmailPass },
              });
              const mailOptions = {
                from: process.env.EMAIL_FROM || "iCCHW-WAJA",
                to: emailData.to,
                subject: emailData.subject,
                text: emailData.text || "",
                html: emailData.html || "",
              };
              const info = await gmailTransporter.sendMail(mailOptions);
              console.log(" > ✉️ Email sent via Gmail fallback to", emailData.to);
              return info;
            } catch (gmailError) {
              console.error("[email-service] Both eGA and Gmail fallback failed");
              throw new CustomError(
                `Failed to send email via eGA: ${egaError?.message || egaError}. Gmail fallback also failed: ${gmailError?.message || gmailError}`,
                500
              );
            }
          }
          throw egaError;
        }
      }
      return await this.sendEmailViaGmail(emailData);
    } catch (error) {
      throw new CustomError("Failed to send email: " + (error?.message || error), 500);
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

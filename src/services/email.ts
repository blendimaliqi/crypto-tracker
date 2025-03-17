import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import config from "../config";
import { Symbol } from "../utils";

// Type definitions
interface MailResponse {
  success: boolean;
  message: string;
}

interface EmailData {
  name?: string;
  email: string;
}

// Email service
let transporter: nodemailer.Transporter | null = null;

// Initialize email service
export function initEmail(): void {
  if (config.email.service === "sendgrid" && config.email.sendgrid.apiKey) {
    console.log("Initializing SendGrid API key...");
    sgMail.setApiKey(config.email.sendgrid.apiKey);
  } else if (config.email.service === "smtp") {
    console.log("SMTP email service will be used");
  } else {
    console.warn("No email service configured properly");
  }
}

// Test email function
export async function testEmailSetup(): Promise<void> {
  try {
    if (config.email.service === "sendgrid") {
      if (!process.env.SENDGRID_API_KEY) {
        console.warn("No SendGrid API key found in environment variables");
        return;
      }
      console.log("SendGrid API key exists, sending test email...");
      await sendTestEmail();
    } else if (config.email.service === "smtp") {
      console.log("SMTP email service configured, sending test email...");
      await sendTestEmail();
    }
  } catch (error) {
    console.error("Error testing email setup:", error);
  }
}

// Send a test email
async function sendTestEmail(): Promise<MailResponse> {
  const subject = "Crypto Tracker - Test Email";
  const text = "This is a test email from your Crypto Tracker application.";
  const html =
    "<p>This is a test email from your <strong>Crypto Tracker</strong> application.</p>";

  try {
    if (config.email.service === "sendgrid") {
      const msg = {
        to: config.email.to,
        from: config.email.from,
        subject,
        text,
        html,
      };

      await sgMail.send(msg);
      console.log("Test email sent successfully via SendGrid");
      return { success: true, message: "Email sent successfully" };
    } else if (config.email.service === "smtp") {
      const transporter = nodemailer.createTransport({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.secure,
        auth: {
          user: config.email.smtp.user,
          pass: config.email.smtp.pass,
        },
      });

      const msg = {
        from: {
          name: config.email.from.name,
          address: config.email.from.email,
        },
        to: config.email.to,
        subject,
        text,
        html,
      };

      const info = await transporter.sendMail(msg);
      console.log(
        "Test email sent successfully via Nodemailer:",
        info.response
      );
      return { success: true, message: "Email sent successfully" };
    }

    console.warn("No email service configured");
    return { success: false, message: "No email service configured" };
  } catch (error) {
    console.error("Error sending test email:", error);
    return { success: false, message: `Error: ${error}` };
  }
}

// Send email notification for new listings
export async function sendEmailNotification(
  newSymbols: Symbol[]
): Promise<MailResponse> {
  if (newSymbols.length === 0) {
    return { success: false, message: "No new symbols to notify about" };
  }

  const subject = `Crypto Tracker - ${newSymbols.length} New Listing${
    newSymbols.length > 1 ? "s" : ""
  } Detected!`;

  // Create the email content
  let text = `New crypto listings detected:\n\n`;
  let html = `<h2>New Crypto Listings Detected</h2>
  <p>The following new listings were found:</p>
  <ul>`;

  for (const symbol of newSymbols) {
    text += `- ${symbol.baseAsset}/${symbol.quoteAsset} on ${symbol.exchange} (${symbol.symbol})\n`;
    html += `<li><strong>${symbol.baseAsset}/${symbol.quoteAsset}</strong> on ${symbol.exchange} (${symbol.symbol})</li>`;
  }

  html += `</ul>
  <p>Happy trading!</p>`;

  try {
    if (config.email.service === "sendgrid") {
      const msg = {
        to: config.email.to,
        from: config.email.from,
        subject,
        text,
        html,
      };

      await sgMail.send(msg);
      console.log("Email notification sent successfully via SendGrid");
      return { success: true, message: "Email sent successfully" };
    } else if (config.email.service === "smtp") {
      const transporter = nodemailer.createTransport({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.secure,
        auth: {
          user: config.email.smtp.user,
          pass: config.email.smtp.pass,
        },
      });

      const msg = {
        from: {
          name: config.email.from.name,
          address: config.email.from.email,
        },
        to: config.email.to,
        subject,
        text,
        html,
      };

      const info = await transporter.sendMail(msg);
      console.log("Email notification sent successfully via Nodemailer");
      return { success: true, message: "Email sent successfully" };
    }

    console.warn("No email service configured");
    return { success: false, message: "No email service configured" };
  } catch (error) {
    console.error("Error sending email notification:", error);
    return { success: false, message: `Error: ${error}` };
  }
}

// Send announcement email notifications
export async function sendAnnouncementEmailNotification(
  announcements: any[]
): Promise<MailResponse> {
  if (announcements.length === 0) {
    return { success: false, message: "No new announcements to notify about" };
  }

  const subject = `Crypto Tracker - ${announcements.length} New Announcement${
    announcements.length > 1 ? "s" : ""
  } Detected!`;

  // Create the email content
  let text = `New crypto announcements detected:\n\n`;
  let html = `<h2>New Crypto Announcements Detected</h2>
  <p>The following new announcements were found:</p>
  <ul>`;

  for (const announcement of announcements) {
    text += `- ${announcement.title} on ${announcement.exchange} (${announcement.date})\n  ${announcement.link}\n\n`;
    html += `<li>
      <strong>${announcement.title}</strong> on ${announcement.exchange} (${announcement.date})
      <br>
      <a href="${announcement.link}">${announcement.link}</a>
    </li>`;
  }

  html += `</ul>
  <p>Happy trading!</p>`;

  try {
    if (config.email.service === "sendgrid") {
      const msg = {
        to: config.email.to,
        from: config.email.from,
        subject,
        text,
        html,
      };

      await sgMail.send(msg);
      console.log(
        "Announcement email notification sent successfully via SendGrid"
      );
      return { success: true, message: "Email sent successfully" };
    } else if (config.email.service === "smtp") {
      const transporter = nodemailer.createTransport({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.secure,
        auth: {
          user: config.email.smtp.user,
          pass: config.email.smtp.pass,
        },
      });

      const msg = {
        from: {
          name: config.email.from.name,
          address: config.email.from.email,
        },
        to: config.email.to,
        subject,
        text,
        html,
      };

      const info = await transporter.sendMail(msg);
      console.log(
        "Announcement email notification sent successfully via Nodemailer"
      );
      return { success: true, message: "Email sent successfully" };
    }

    console.warn("No email service configured");
    return { success: false, message: "No email service configured" };
  } catch (error) {
    console.error("Error sending announcement email notification:", error);
    return { success: false, message: `Error: ${error}` };
  }
}

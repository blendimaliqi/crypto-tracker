"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initEmail = initEmail;
exports.testEmailSetup = testEmailSetup;
exports.sendEmailNotification = sendEmailNotification;
exports.sendAnnouncementEmailNotification = sendAnnouncementEmailNotification;
const mail_1 = __importDefault(require("@sendgrid/mail"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = __importDefault(require("../config"));
// Email service
let transporter = null;
// Initialize email service
function initEmail() {
    if (config_1.default.email.service === "sendgrid" && config_1.default.email.sendgrid.apiKey) {
        console.log("Initializing SendGrid API key...");
        mail_1.default.setApiKey(config_1.default.email.sendgrid.apiKey);
    }
    else if (config_1.default.email.service === "smtp") {
        console.log("SMTP email service will be used");
    }
    else {
        console.warn("No email service configured properly");
    }
}
// Test email function
async function testEmailSetup() {
    try {
        if (config_1.default.email.service === "sendgrid") {
            if (!process.env.SENDGRID_API_KEY) {
                console.warn("No SendGrid API key found in environment variables");
                return;
            }
            console.log("SendGrid API key exists, sending test email...");
            await sendTestEmail();
        }
        else if (config_1.default.email.service === "smtp") {
            console.log("SMTP email service configured, sending test email...");
            await sendTestEmail();
        }
    }
    catch (error) {
        console.error("Error testing email setup:", error);
    }
}
// Send a test email
async function sendTestEmail() {
    const subject = "Crypto Tracker - Test Email";
    const text = "This is a test email from your Crypto Tracker application.";
    const html = "<p>This is a test email from your <strong>Crypto Tracker</strong> application.</p>";
    try {
        if (config_1.default.email.service === "sendgrid") {
            const msg = {
                to: config_1.default.email.to,
                from: config_1.default.email.from,
                subject,
                text,
                html,
            };
            await mail_1.default.send(msg);
            console.log("Test email sent successfully via SendGrid");
            return { success: true, message: "Email sent successfully" };
        }
        else if (config_1.default.email.service === "smtp") {
            const transporter = nodemailer_1.default.createTransport({
                host: config_1.default.email.smtp.host,
                port: config_1.default.email.smtp.port,
                secure: config_1.default.email.smtp.secure,
                auth: {
                    user: config_1.default.email.smtp.user,
                    pass: config_1.default.email.smtp.pass,
                },
            });
            const msg = {
                from: {
                    name: config_1.default.email.from.name,
                    address: config_1.default.email.from.email,
                },
                to: config_1.default.email.to,
                subject,
                text,
                html,
            };
            const info = await transporter.sendMail(msg);
            console.log("Test email sent successfully via Nodemailer:", info.response);
            return { success: true, message: "Email sent successfully" };
        }
        console.warn("No email service configured");
        return { success: false, message: "No email service configured" };
    }
    catch (error) {
        console.error("Error sending test email:", error);
        return { success: false, message: `Error: ${error}` };
    }
}
// Send email notification for new listings
async function sendEmailNotification(newSymbols) {
    if (newSymbols.length === 0) {
        return { success: false, message: "No new symbols to notify about" };
    }
    const subject = `Crypto Tracker - ${newSymbols.length} New Listing${newSymbols.length > 1 ? "s" : ""} Detected!`;
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
        if (config_1.default.email.service === "sendgrid") {
            const msg = {
                to: config_1.default.email.to,
                from: config_1.default.email.from,
                subject,
                text,
                html,
            };
            await mail_1.default.send(msg);
            console.log("Email notification sent successfully via SendGrid");
            return { success: true, message: "Email sent successfully" };
        }
        else if (config_1.default.email.service === "smtp") {
            const transporter = nodemailer_1.default.createTransport({
                host: config_1.default.email.smtp.host,
                port: config_1.default.email.smtp.port,
                secure: config_1.default.email.smtp.secure,
                auth: {
                    user: config_1.default.email.smtp.user,
                    pass: config_1.default.email.smtp.pass,
                },
            });
            const msg = {
                from: {
                    name: config_1.default.email.from.name,
                    address: config_1.default.email.from.email,
                },
                to: config_1.default.email.to,
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
    }
    catch (error) {
        console.error("Error sending email notification:", error);
        return { success: false, message: `Error: ${error}` };
    }
}
// Send announcement email notifications
async function sendAnnouncementEmailNotification(announcements) {
    if (announcements.length === 0) {
        return { success: false, message: "No new announcements to notify about" };
    }
    const subject = `Crypto Tracker - ${announcements.length} New Announcement${announcements.length > 1 ? "s" : ""} Detected!`;
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
        if (config_1.default.email.service === "sendgrid") {
            const msg = {
                to: config_1.default.email.to,
                from: config_1.default.email.from,
                subject,
                text,
                html,
            };
            await mail_1.default.send(msg);
            console.log("Announcement email notification sent successfully via SendGrid");
            return { success: true, message: "Email sent successfully" };
        }
        else if (config_1.default.email.service === "smtp") {
            const transporter = nodemailer_1.default.createTransport({
                host: config_1.default.email.smtp.host,
                port: config_1.default.email.smtp.port,
                secure: config_1.default.email.smtp.secure,
                auth: {
                    user: config_1.default.email.smtp.user,
                    pass: config_1.default.email.smtp.pass,
                },
            });
            const msg = {
                from: {
                    name: config_1.default.email.from.name,
                    address: config_1.default.email.from.email,
                },
                to: config_1.default.email.to,
                subject,
                text,
                html,
            };
            const info = await transporter.sendMail(msg);
            console.log("Announcement email notification sent successfully via Nodemailer");
            return { success: true, message: "Email sent successfully" };
        }
        console.warn("No email service configured");
        return { success: false, message: "No email service configured" };
    }
    catch (error) {
        console.error("Error sending announcement email notification:", error);
        return { success: false, message: `Error: ${error}` };
    }
}

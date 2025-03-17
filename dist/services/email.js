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
    // Create HTML version with modern styling
    const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Email</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f9f9f9;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 700px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 3px 6px rgba(0,0,0,0.1);
      }
      .header {
        text-align: center;
        padding: 20px 0;
        border-bottom: 2px solid #f0f0f0;
        margin-bottom: 20px;
      }
      .header h1 {
        color: #2c3e50;
        font-size: 28px;
        margin: 0;
      }
      .content {
        padding: 20px 0;
      }
      .success-box {
        background-color: #d4edda;
        color: #155724;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
        border-left: 5px solid #28a745;
      }
      .footer {
        text-align: center;
        padding-top: 20px;
        margin-top: 30px;
        border-top: 1px solid #eee;
        color: #7f8c8d;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Crypto Tracker</h1>
      </div>
      <div class="content">
        <h2>Test Email Successful</h2>
        <p>This is a test email from your <strong>Crypto Tracker</strong> application. If you're seeing this, your email configuration is working properly.</p>
        
        <div class="success-box">
          <p>✓ Your email configuration is set up correctly!</p>
        </div>
        
        <p>You will receive notifications at this email address when:</p>
        <ul>
          <li>New crypto listings are detected on exchanges</li>
          <li>New coin announcements are found</li>
        </ul>
      </div>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} Crypto Tracker</p>
      </div>
    </div>
  </body>
  </html>`;
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
    // Group symbols by exchange
    const symbolsByExchange = {};
    for (const symbol of newSymbols) {
        if (!symbolsByExchange[symbol.exchange]) {
            symbolsByExchange[symbol.exchange] = [];
        }
        symbolsByExchange[symbol.exchange].push(symbol);
        // Add to plain text version
        text += `- ${symbol.baseAsset}/${symbol.quoteAsset} on ${symbol.exchange} (${symbol.symbol})\n`;
    }
    // Create HTML version with modern styling
    let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Crypto Listings</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f9f9f9;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 700px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 3px 6px rgba(0,0,0,0.1);
      }
      .header {
        text-align: center;
        padding: 20px 0;
        border-bottom: 2px solid #f0f0f0;
        margin-bottom: 20px;
      }
      .header h1 {
        color: #2c3e50;
        font-size: 28px;
        margin: 0;
      }
      h2 {
        color: #2980b9;
        font-size: 22px;
        margin-top: 30px;
        margin-bottom: 15px;
        padding-bottom: 8px;
        border-bottom: 1px solid #eee;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      th {
        background-color: #2980b9;
        color: white;
        font-weight: 600;
        text-align: left;
        padding: 12px 15px;
        text-transform: uppercase;
        font-size: 14px;
        letter-spacing: 0.5px;
      }
      td {
        padding: 12px 15px;
        border-bottom: 1px solid #e0e0e0;
        font-size: 15px;
      }
      tr:nth-child(even) {
        background-color: #f7f9fc;
      }
      tr:hover {
        background-color: #f1f5f9;
      }
      .token-pair {
        font-weight: 600;
        color: #2c3e50;
      }
      .base-asset {
        color: #27ae60;
        font-weight: bold;
      }
      .quote-asset {
        color: #7f8c8d;
      }
      .symbol {
        font-family: monospace;
        background-color: #f5f5f5;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 14px;
        color: #e74c3c;
      }
      .exchange-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
      }
      .binance {
        background-color: #f3ba2f;
        color: #000;
      }
      .okx {
        background-color: #121212;
        color: #fff;
      }
      .coinbase {
        background-color: #0052ff;
        color: #fff;
      }
      .other {
        background-color: #95a5a6;
        color: #fff;
      }
      .footer {
        text-align: center;
        padding-top: 20px;
        margin-top: 30px;
        border-top: 1px solid #eee;
        color: #7f8c8d;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>New Crypto Listings Alert</h1>
      </div>
      <p>We've detected ${newSymbols.length} new crypto listing${newSymbols.length > 1 ? "s" : ""} across various exchanges:</p>`;
    // Add tables for each exchange
    Object.entries(symbolsByExchange).forEach(([exchange, symbols]) => {
        html += `
      <h2>${exchange.toUpperCase()} (${symbols.length} new listing${symbols.length > 1 ? "s" : ""})</h2>
      <table>
        <thead>
          <tr>
            <th>Trading Pair</th>
            <th>Symbol</th>
          </tr>
        </thead>
        <tbody>`;
        symbols.forEach((symbol) => {
            const badgeClass = exchange.toLowerCase() === "binance"
                ? "binance"
                : exchange.toLowerCase() === "okx"
                    ? "okx"
                    : exchange.toLowerCase() === "coinbase"
                        ? "coinbase"
                        : "other";
            html += `
          <tr>
            <td>
              <span class="token-pair">
                <span class="base-asset">${symbol.baseAsset}</span>/<span class="quote-asset">${symbol.quoteAsset}</span>
              </span>
            </td>
            <td>
              <span class="symbol">${symbol.symbol}</span>
            </td>
          </tr>`;
        });
        html += `
        </tbody>
      </table>`;
    });
    html += `
      <div class="footer">
        <p>Happy trading!</p>
        <p>© ${new Date().getFullYear()} Crypto Tracker - Listings Monitor</p>
      </div>
    </div>
  </body>
  </html>`;
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
    // Group announcements by exchange
    const announcementsByExchange = {};
    for (const announcement of announcements) {
        if (!announcementsByExchange[announcement.exchange]) {
            announcementsByExchange[announcement.exchange] = [];
        }
        announcementsByExchange[announcement.exchange].push(announcement);
        // Add to plain text version
        text += `- ${announcement.title} on ${announcement.exchange} (${announcement.date})\n  ${announcement.link}\n\n`;
    }
    // Create HTML version with modern styling
    let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Crypto Announcements</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f9f9f9;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 700px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 3px 6px rgba(0,0,0,0.1);
      }
      .header {
        text-align: center;
        padding: 20px 0;
        border-bottom: 2px solid #f0f0f0;
        margin-bottom: 20px;
      }
      .header h1 {
        color: #2c3e50;
        font-size: 28px;
        margin: 0;
      }
      h2 {
        color: #2980b9;
        font-size: 22px;
        margin-top: 30px;
        margin-bottom: 15px;
        padding-bottom: 8px;
        border-bottom: 1px solid #eee;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      th {
        background-color: #2980b9;
        color: white;
        font-weight: 600;
        text-align: left;
        padding: 12px 15px;
        text-transform: uppercase;
        font-size: 14px;
        letter-spacing: 0.5px;
      }
      td {
        padding: 12px 15px;
        border-bottom: 1px solid #e0e0e0;
        font-size: 15px;
      }
      tr:nth-child(even) {
        background-color: #f7f9fc;
      }
      tr:hover {
        background-color: #f1f5f9;
      }
      .announcement-title {
        font-weight: 600;
        color: #2c3e50;
      }
      .exchange-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
      }
      .binance {
        background-color: #f3ba2f;
        color: #000;
      }
      .okx {
        background-color: #121212;
        color: #fff;
      }
      .coinbase {
        background-color: #0052ff;
        color: #fff;
      }
      .other {
        background-color: #95a5a6;
        color: #fff;
      }
      a {
        color: #3498db;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      .footer {
        text-align: center;
        padding-top: 20px;
        margin-top: 30px;
        border-top: 1px solid #eee;
        color: #7f8c8d;
        font-size: 14px;
      }
      .date {
        font-size: 13px;
        color: #7f8c8d;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Crypto Announcements Alert</h1>
      </div>
      <p>We've detected ${announcements.length} new crypto announcement${announcements.length > 1 ? "s" : ""} across various exchanges:</p>`;
    // Add tables for each exchange
    Object.entries(announcementsByExchange).forEach(([exchange, items]) => {
        html += `
      <h2>${exchange.toUpperCase()} (${items.length} announcement${items.length > 1 ? "s" : ""})</h2>
      <table>
        <thead>
          <tr>
            <th>Announcement</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>`;
        items.forEach((announcement) => {
            const badgeClass = exchange.toLowerCase() === "binance"
                ? "binance"
                : exchange.toLowerCase() === "okx"
                    ? "okx"
                    : exchange.toLowerCase() === "coinbase"
                        ? "coinbase"
                        : "other";
            // Format the date to be more readable
            const date = new Date(announcement.date);
            const formattedDate = date.toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
            html += `
          <tr>
            <td>
              <span class="announcement-title">${announcement.title}</span>
              <br>
              <a href="${announcement.link}" target="_blank">View announcement</a>
            </td>
            <td class="date">${formattedDate}</td>
          </tr>`;
        });
        html += `
        </tbody>
      </table>`;
    });
    html += `
      <div class="footer">
        <p>Happy trading!</p>
        <p>© ${new Date().getFullYear()} Crypto Tracker - Announcements Monitor</p>
      </div>
    </div>
  </body>
  </html>`;
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

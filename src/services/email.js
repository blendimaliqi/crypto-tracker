const sgMail = require("@sendgrid/mail");
const nodemailer = require("nodemailer");
const config = require("../config");

// Email service
let transporter = null;

// Initialize email service
function initializeEmailService() {
  if (config.email.apiKey && !config.email.useNodemailer) {
    sgMail.setApiKey(config.email.apiKey);
    console.log("SendGrid initialized with API key");
  } else if (config.email.useNodemailer) {
    // Create nodemailer transporter
    transporter = nodemailer.createTransport({
      service: config.email.nodemailer.service,
      auth: config.email.nodemailer.auth,
    });
    console.log("Nodemailer transporter initialized");
  } else {
    console.error("No email configuration found in environment variables!");
  }
}

// Test email function
async function testEmailSetup() {
  console.log("=== TESTING EMAIL SETUP ===");
  console.log("Environment variables:");
  console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`- SENDGRID_API_KEY exists: ${!!process.env.SENDGRID_API_KEY}`);
  console.log(
    `- Using fallback APP_PASSWORD: ${
      !process.env.SENDGRID_API_KEY && !!process.env.APP_PASSWORD
    }`
  );

  if (!config.email.apiKey) {
    console.error(
      "❌ No SendGrid API key found! Email functionality will not work."
    );
    return;
  }

  try {
    console.log("Attempting to send test email via SendGrid...");
    const testListings = [
      {
        symbol: "TEST-BTC",
        baseAsset: "TEST",
        quoteAsset: "BTC",
        exchange: "binance",
      },
      {
        symbol: "TEST-USD",
        baseAsset: "TEST",
        quoteAsset: "USD",
        exchange: "coinbase",
      },
    ];

    const success = await sendEmail(testListings);

    if (success) {
      console.log(
        "✅ Test email sent successfully via SendGrid! Check your inbox."
      );
    } else {
      console.error(
        "❌ Test email failed to send (no error thrown but operation failed)."
      );
    }
  } catch (error) {
    console.error("❌ Error sending test email:", error);
    console.error("Stack trace:", error.stack);
  }
}

// Send email notification for new listings
async function sendEmail(newListings) {
  console.log("Attempting to send email notification via SendGrid...");
  console.log(
    `Using email configuration: From=${config.email.from}, To=${config.email.to}`
  );
  console.log(`SendGrid API key exists: ${!!config.email.apiKey}`);

  try {
    // Group listings by exchange
    const listingsByExchange = {};
    newListings.forEach((listing) => {
      if (!listingsByExchange[listing.exchange]) {
        listingsByExchange[listing.exchange] = [];
      }
      listingsByExchange[listing.exchange].push(listing);
    });

    // Create HTML content for each exchange
    let emailContent = "";
    Object.entries(listingsByExchange).forEach(([exchange, listings]) => {
      const symbolList = listings
        .map(
          (symbol) =>
            `<li>${symbol.symbol} - Base Asset: ${symbol.baseAsset}, Quote Asset: ${symbol.quoteAsset}</li>`
        )
        .join("");

      emailContent += `
        <h3 style="color: #2b5278; margin-top: 20px;">${exchange.toUpperCase()} (${
        listings.length
      } new listings)</h3>
        <ul>${symbolList}</ul>
      `;
    });

    const msg = {
      to: config.email.to,
      from: config.email.from, // Verified SendGrid sender
      replyTo: config.email.from, // Set reply-to to the same address
      subject: `🚨 URGENT: New Crypto Listings Found! (${
        newListings.length
      } across ${Object.keys(listingsByExchange).length} exchanges)`,
      html: `
        <h2 style="color: #FF0000;">New Cryptocurrency Listings Detected!</h2>
        <p style="font-weight: bold;">The following new symbols have been detected across exchanges:</p>
        ${emailContent}
        <p>Check the respective exchanges for more details.</p>
        <p style="font-size: 12px; color: #666;">This is an automated notification from your Multi-Exchange Crypto Tracker. Please do not reply to this email.</p>
      `,
    };

    console.log(
      "Sending email with the following options:",
      JSON.stringify(msg, null, 2)
    );

    let success = false;
    if (config.email.useNodemailer && transporter) {
      // Use nodemailer
      const info = await transporter.sendMail(msg);
      console.log("Email sent successfully via Nodemailer:", info.response);
      success = true;
    } else if (config.email.apiKey) {
      // Use SendGrid
      const response = await sgMail.send(msg);
      console.log(
        "Email sent successfully via SendGrid:",
        response[0].statusCode
      );
      success = true;
    } else {
      console.error("No email sending method available!");
      return false;
    }

    return success;
  } catch (error) {
    console.error("Error sending email via SendGrid:", error);
    if (error.response) {
      console.error("SendGrid API error details:", error.response.body);
    }
    return false;
  }
}

// Send announcement email notifications
async function sendAnnouncementEmail(announcements) {
  if (!config.email.enabled) {
    console.log("Email notifications disabled in config.");
    return false;
  }

  console.log("Sending email notification for new announcements...");

  try {
    // Group announcements by exchange
    const announcementsByExchange = {};
    announcements.forEach((announcement) => {
      if (!announcementsByExchange[announcement.exchange]) {
        announcementsByExchange[announcement.exchange] = [];
      }
      announcementsByExchange[announcement.exchange].push(announcement);
    });

    // Create HTML content with tables
    let emailContent = "";
    Object.entries(announcementsByExchange).forEach(([exchange, items]) => {
      // Create a table for each exchange
      emailContent += `
        <h3 style="color: #2b5278; margin-top: 20px; font-family: Arial, sans-serif;">${exchange.toUpperCase()} (${
        items.length
      } new announcement${items.length > 1 ? "s" : ""})</h3>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif;">
          <thead>
            <tr style="background-color: #f2f7fd;">
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Announcement</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Symbols</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Date</th>
            </tr>
          </thead>
          <tbody>
      `;

      // Add rows for each announcement
      items.forEach((item, index) => {
        const bgColor = index % 2 === 0 ? "#ffffff" : "#f9f9f9";
        const symbolInfo =
          item.symbols && item.symbols.length > 0
            ? item.symbols.join(", ")
            : "N/A";

        const dateStr = item.date
          ? new Date(item.date).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "N/A";

        emailContent += `
          <tr style="background-color: ${bgColor};">
            <td style="padding: 10px; border: 1px solid #ddd;">
              <a href="${
                item.url
              }" style="color: #0066cc; text-decoration: underline; font-weight: ${
          item.symbols && item.symbols.length > 0 ? "bold" : "normal"
        };">
                ${item.title}
              </a>
            </td>
            <td style="padding: 10px; border: 1px solid #ddd; ${
              item.symbols && item.symbols.length > 0
                ? "font-weight: bold; color: #0066cc;"
                : ""
            }">
              ${symbolInfo}
            </td>
            <td style="padding: 10px; border: 1px solid #ddd;">
              ${dateStr}
            </td>
          </tr>
        `;
      });

      emailContent += `
          </tbody>
        </table>
      `;
    });

    // Prepare email
    const emailSubject = `🚨 URGENT: New Crypto Listings Announced! (${
      announcements.length
    } across ${Object.keys(announcementsByExchange).length} exchanges)`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Crypto Listings</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; border-left: 5px solid #ff3860;">
          <h2 style="color: #FF0000; margin-top: 0;">New Cryptocurrency Listing Announcements!</h2>
          <p style="font-weight: bold;">The following new listing announcements have been detected:</p>
        </div>
        
        ${emailContent}
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <p><strong>Note:</strong> These are announcements of upcoming listings. The tokens may not be available for trading yet.</p>
          <p style="font-size: 12px; color: #666; margin-bottom: 0;">This is an automated notification from your Multi-Exchange Crypto Tracker. Please do not reply to this email.</p>
        </div>
      </body>
      </html>
    `;

    // Add a plain text table version for clients that don't support HTML
    let textContent = "NEW CRYPTOCURRENCY LISTING ANNOUNCEMENTS\n\n";
    Object.entries(announcementsByExchange).forEach(([exchange, items]) => {
      textContent += `${exchange.toUpperCase()} (${
        items.length
      } new announcement${items.length > 1 ? "s" : ""}):\n`;

      // Add a text-based table header
      textContent +=
        "------------------------------------------------------------\n";
      textContent += "ANNOUNCEMENT                      | SYMBOLS     | DATE\n";
      textContent +=
        "------------------------------------------------------------\n";

      items.forEach((item) => {
        const symbolInfo =
          item.symbols && item.symbols.length > 0
            ? item.symbols.join(", ")
            : "N/A";

        const dateStr = item.date
          ? new Date(item.date).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "N/A";

        // Format as fixed-width columns for plain text
        const titleTruncated =
          item.title.length > 30
            ? item.title.substring(0, 27) + "..."
            : item.title.padEnd(30, " ");

        const symbolsTruncated =
          symbolInfo.length > 10
            ? symbolInfo.substring(0, 7) + "..."
            : symbolInfo.padEnd(10, " ");

        textContent += `${titleTruncated} | ${symbolsTruncated} | ${dateStr}\n`;
      });

      textContent +=
        "------------------------------------------------------------\n\n";
    });

    let success = false;

    console.log("Sending announcement email with subject:", emailSubject);

    // Choose email sending method based on configuration
    if (config.email.useNodemailer && transporter) {
      // Use nodemailer
      console.log("Sending email using Nodemailer");
      const mailOptions = {
        from: config.email.from,
        to: config.email.to,
        subject: emailSubject,
        text: textContent,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully via Nodemailer:", info.response);
      success = true;
    } else if (config.email.apiKey) {
      // Use SendGrid
      console.log("Sending email using SendGrid");
      const msg = {
        to: config.email.to,
        from: config.email.from,
        replyTo: config.email.from,
        subject: emailSubject,
        text: textContent,
        html: htmlContent,
      };

      const response = await sgMail.send(msg);
      console.log(
        "Email sent successfully via SendGrid, status code:",
        response[0].statusCode
      );
      success = true;
    } else {
      console.error("No email sending method available!");
      return false;
    }

    return success;
  } catch (error) {
    console.error("Error sending announcement email:", error);
    return false;
  }
}

module.exports = {
  initializeEmailService,
  testEmailSetup,
  sendEmail,
  sendAnnouncementEmail,
};

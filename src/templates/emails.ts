/**
 * Email Templates
 * This file contains all the email templates used in the application
 */

/**
 * Generate a test email template
 */
export function getTestEmailTemplate(): string {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Email</title>
    <style>
      ${getEmailBaseStyles()}
      .success-box {
        background-color: #d4edda;
        color: #155724;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
        border-left: 5px solid #28a745;
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
}

/**
 * Generate a new listings email template
 */
export function getNewListingsEmailTemplate(
  newSymbols: any[],
  symbolsByExchange: { [key: string]: any[] }
): string {
  let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Crypto Listings</title>
    <style>
      ${getEmailBaseStyles()}
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
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>New Crypto Listings Alert</h1>
      </div>
      <p>We've detected ${newSymbols.length} new crypto listing${
    newSymbols.length > 1 ? "s" : ""
  } across various exchanges:</p>`;

  // Add tables for each exchange
  Object.entries(symbolsByExchange).forEach(([exchange, symbols]) => {
    html += `
      <h2>${exchange.toUpperCase()} (${symbols.length} new listing${
      symbols.length > 1 ? "s" : ""
    })</h2>
      <table>
        <thead>
          <tr>
            <th>Trading Pair</th>
            <th>Symbol</th>
          </tr>
        </thead>
        <tbody>`;

    symbols.forEach((symbol) => {
      const badgeClass = getExchangeBadgeClass(exchange);

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

  return html;
}

/**
 * Generate an announcements email template
 */
export function getAnnouncementsEmailTemplate(
  announcements: any[],
  announcementsByExchange: { [key: string]: any[] }
): string {
  let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Crypto Announcements</title>
    <style>
      ${getEmailBaseStyles()}
      .announcement-title {
        font-weight: 600;
        color: #2c3e50;
      }
      a {
        color: #3498db;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
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
      <p>We've detected ${announcements.length} new crypto announcement${
    announcements.length > 1 ? "s" : ""
  } across various exchanges:</p>`;

  // Add tables for each exchange
  Object.entries(announcementsByExchange).forEach(([exchange, items]) => {
    html += `
      <h2>${exchange.toUpperCase()} (${items.length} announcement${
      items.length > 1 ? "s" : ""
    })</h2>
      <table>
        <thead>
          <tr>
            <th>Announcement</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>`;

    items.forEach((announcement) => {
      const badgeClass = getExchangeBadgeClass(exchange);

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

  return html;
}

/**
 * Helper function to determine exchange badge class
 */
function getExchangeBadgeClass(exchange: string): string {
  return exchange.toLowerCase() === "binance"
    ? "binance"
    : exchange.toLowerCase() === "okx"
    ? "okx"
    : exchange.toLowerCase() === "coinbase"
    ? "coinbase"
    : "other";
}

/**
 * Base CSS styles for all email templates
 */
function getEmailBaseStyles(): string {
  return `
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
      .content {
        padding: 20px 0;
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
  `;
}

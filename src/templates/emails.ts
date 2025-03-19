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
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 {
            color: #2c3e50;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
          }
          h2 {
            color: #2c3e50;
            margin-top: 30px;
          }
          .announcement {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f9f9f9;
            border-left: 4px solid #3498db;
            border-radius: 4px;
          }
          .announcement h3 {
            margin-top: 0;
            margin-bottom: 5px;
            color: #2980b9;
          }
          .announcement p {
            margin-top: 5px;
            color: #555;
          }
          .announcement .description {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
            margin-bottom: 10px;
            font-style: italic;
          }
          .announcement .meta {
            font-size: 12px;
            color: #888;
          }
          .announcement a {
            color: #3498db;
            text-decoration: none;
          }
          .announcement a:hover {
            text-decoration: underline;
          }
          .symbols {
            margin-top: 8px;
            font-size: 13px;
          }
          .symbol {
            display: inline-block;
            background-color: #e8f4fc;
            border: 1px solid #c5e5fc;
            border-radius: 3px;
            padding: 2px 8px;
            margin-right: 5px;
            margin-bottom: 5px;
            color: #2980b9;
            font-size: 12px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #888;
          }
        </style>
      </head>
      <body>
        <h1>New Cryptocurrency Announcements</h1>
        <p>The Crypto Tracker has detected ${
          announcements.length
        } new announcement${announcements.length > 1 ? "s" : ""}.</p>
  `;

  // Add each exchange's announcements
  for (const [exchange, items] of Object.entries(announcementsByExchange)) {
    const exchangeName = exchange.toUpperCase();
    html += `<h2>${exchangeName} (${items.length} announcement${
      items.length > 1 ? "s" : ""
    })</h2>`;

    // Add each announcement
    for (const announcement of items) {
      html += `
        <div class="announcement">
          <h3><a href="${announcement.link}" target="_blank">${
        announcement.title
      }</a></h3>
          ${
            announcement.description
              ? `<div class="description">${announcement.description}</div>`
              : ""
          }
          <div class="meta">Date: ${new Date(
            announcement.date
          ).toLocaleString()}</div>
          `;

      // Add symbols if available
      if (announcement.symbols && announcement.symbols.length > 0) {
        html += `<div class="symbols">`;
        for (const symbol of announcement.symbols) {
          html += `<span class="symbol">${symbol}</span>`;
        }
        html += `</div>`;
      }

      html += `</div>`;
    }
  }

  // Add footer
  html += `
        <div class="footer">
          <p>This is an automated notification from the Crypto Tracker. Please do not reply to this email.</p>
        </div>
      </body>
    </html>
  `;

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

const puppeteer = require('puppeteer');
const logger = require('./logger');
const markdown = require('./markdown');

/**
 * Convert markdown content to HTML
 */
const markdownToHtml = (markdownContent) => {
  return markdown.render(markdownContent);
};

/**
 * Generate PDF from markdown content
 */
const generatePdfFromMarkdown = async (markdownContent, options = {}) => {
  try {
    // Convert markdown to HTML
    const html = markdownToHtml(markdownContent);

    // Create HTML document with styling
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Resume</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1, h2, h3, h4, h5, h6 {
              color: #2c3e50;
              margin-top: 20px;
              margin-bottom: 10px;
            }
            h1 {
              font-size: 24px;
              border-bottom: 1px solid #eee;
              padding-bottom: 10px;
            }
            h2 {
              font-size: 20px;
              border-bottom: 1px solid #eee;
              padding-bottom: 6px;
            }
            h3 {
              font-size: 18px;
            }
            p {
              margin: 10px 0;
            }
            ul, ol {
              margin: 10px 0;
              padding-left: 20px;
            }
            li {
              margin: 5px 0;
            }
            code {
              background-color: #f6f8fa;
              padding: 2px 4px;
              font-family: monospace;
              border-radius: 3px;
            }
            pre {
              background-color: #f6f8fa;
              padding: 10px;
              border-radius: 3px;
              overflow-x: auto;
            }
            a {
              color: #0366d6;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 20px 0;
            }
            table, th, td {
              border: 1px solid #ddd;
            }
            th, td {
              padding: 8px 12px;
              text-align: left;
            }
            th {
              background-color: #f6f8fa;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            hr {
              border: 0;
              height: 1px;
              background-color: #ddd;
              margin: 20px 0;
            }
            blockquote {
              color: #666;
              margin: 0;
              padding-left: 15px;
              border-left: 4px solid #ddd;
            }
            @media print {
              body {
                padding: 0;
                font-size: 12px;
              }
              h1 {
                font-size: 18px;
              }
              h2 {
                font-size: 16px;
              }
              h3 {
                font-size: 14px;
              }
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new'
    });

    // Create page
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      printBackground: true,
      ...options
    });

    // Close browser
    await browser.close();

    return pdfBuffer;
  } catch (error) {
    logger.error('PDF generation error:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

module.exports = {
  generatePdfFromMarkdown
};
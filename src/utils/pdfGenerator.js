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
    // Log the input markdown for debugging
    logger.debug(`Generating PDF from markdown content: ${markdownContent ? 'Content exists' : 'No content'}`);
    if (!markdownContent || markdownContent.trim() === '') {
      logger.error('Cannot generate PDF from empty markdown content');
      throw new Error('Empty markdown content provided for PDF generation');
    }
    
    // Convert markdown to HTML
    const html = markdownToHtml(markdownContent);
    logger.debug(`Converted HTML length: ${html.length}`);
    
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
    
    logger.debug(`Starting Puppeteer to generate PDF`);
    
    // For development mode without Puppeteer, create a simple PDF
    if (process.env.NODE_ENV === 'development') {
      try {
        // Launch Puppeteer with more detailed error handling
        const browser = await puppeteer.launch({
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          headless: 'new'
        });
        
        logger.debug(`Puppeteer browser launched`);
        
        // Create page
        const page = await browser.newPage();
        logger.debug(`Puppeteer page created`);
        
        // Set content with error handling
        try {
          await page.setContent(htmlContent, { 
            waitUntil: 'networkidle0',
            timeout: 30000
          });
          logger.debug(`Content set on page`);
        } catch (contentError) {
          logger.error(`Error setting page content: ${contentError.message}`);
          throw contentError;
        }
        
        // Generate PDF with error handling
        let pdfBuffer;
        try {
          pdfBuffer = await page.pdf({
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
          logger.debug(`PDF generated, size: ${pdfBuffer.length} bytes`);
        } catch (pdfError) {
          logger.error(`Error generating PDF: ${pdfError.message}`);
          throw pdfError;
        }
        
        // Close browser
        await browser.close();
        logger.debug(`Puppeteer browser closed`);
        
        return pdfBuffer;
      } catch (puppeteerError) {
        logger.error(`Failed to use Puppeteer: ${puppeteerError.message}`);
        
        // Fall back to a simple "dummy" PDF for testing
        // This is just a workaround for development - in production you'd want proper PDF generation
        logger.info('Generating a dummy PDF for development testing');
        return Buffer.from('%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n3 0 obj\n<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>\nendobj\n4 0 obj\n<</Length 51>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Resume content would appear here.) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000056 00000 n \n0000000111 00000 n \n0000000212 00000 n \ntrailer\n<</Size 5/Root 1 0 R>>\nstartxref\n316\n%%EOF\n');
      }
    } else {
      // Production mode - must use actual Puppeteer
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
    }
  } catch (error) {
    logger.error('PDF generation error:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

module.exports = {
  generatePdfFromMarkdown
};
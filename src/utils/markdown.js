const marked = require('marked');
const logger = require('./logger');

// Configure marked
marked.setOptions({
  headerIds: true,
  gfm: true,
  breaks: true,
  sanitize: false,
  smartLists: true,
  smartypants: true,
  xhtml: true
});

/**
 * Render markdown to HTML
 */
const render = (markdownContent) => {
  try {
    if (!markdownContent) {
      return '';
    }
    return marked.parse(markdownContent);
  } catch (error) {
    logger.error('Markdown rendering error:', error);
    return `<p>Failed to render markdown: ${error.message}</p>`;
  }
};

module.exports = {
  render
};
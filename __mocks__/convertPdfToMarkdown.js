/**
 * Mock for convertPdfToMarkdown utility
 */

const mockConvertPdfToMarkdown = jest.fn((pdfBuffer) => {
  return Promise.resolve(`# Mock Resume

This is a mocked resume content for testing.

## EXPERIENCE

### Software Engineer | ABC Company

- Developed features for enterprise applications
- Collaborated with cross-functional teams

## EDUCATION

### University of Testing

Bachelor of Science in Computer Science
`);
});

module.exports = mockConvertPdfToMarkdown;

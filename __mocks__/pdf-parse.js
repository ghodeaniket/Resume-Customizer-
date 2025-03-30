/**
 * Mock for pdf-parse package
 */

const mockPdfParse = jest.fn(buffer => {
  return Promise.resolve({
    text: "MOCK PDF CONTENT\n\nThis is a mock PDF content for testing purposes.",
    numpages: 1,
    info: {
      PDFFormatVersion: '1.4',
      IsAcroFormPresent: false,
      IsXFAPresent: false,
      Author: 'Mock Author',
      Creator: 'Mock Creator',
      Producer: 'Mock Producer',
      CreationDate: 'D:20250330120000+00\'00\'',
      ModDate: 'D:20250330120000+00\'00\''
    },
    metadata: null,
    version: '1.10.100'
  });
});

module.exports = mockPdfParse;

const fs = require("fs");
const pdf = require("pdf-parse");

// Replace 'your-cv.pdf' with the path to your PDF CV file
const pdfPath = "./NGUYEN_CUONG_PHAT_Resume.pdf";

const convertPdfToText = async (buffer) => {
  try {
    // Read the PDF file
    // const dataBuffer = fs.readFileSync(pdfPath);

    // Convert the PDF to text
    const data = await pdf(buffer);

    // Extract text content from the PDF
    const text = data.text;

    // Print the text to the console
    // console.log(text);
    return text;
  } catch (error) {
    console.error("Error:", error);
  }
};

module.exports = { convertPdfToText };

// convertPdfToText();

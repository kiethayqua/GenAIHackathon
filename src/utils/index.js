const pdf = require("pdf-parse");

module.exports = {
    convertPdfToText: async (buffer) => {
        try {
            const data = await pdf(buffer);
            const text = data.text;
            return text;
        } catch (error) {
            return "";
        }
    },
    getNumberResult: (string) => {
        const numberPattern = /\d+/g;
        return Number(string.match(numberPattern)?.[0] || 0);
    }
}
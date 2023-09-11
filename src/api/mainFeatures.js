const express = require("express");
const request = require("request");
const OAuth2ClientInstance = require("../auth/OAuth2ClientInstance");
const { google } = require('googleapis');
const fs = require('fs');

const router = express.Router();

const azure = {
    apiKey: process.env.AZURE_API_KEY,
    version: '2023-05-15',
    resourceName: 'momo-genai-17',
    gpt35: 'gpt-35',
    gpt4: 'gpt-4'
}

const chatGPTAzure = (prompt) => {
    prompt = prompt.replace("“", "\"");
    const payload = {
        messages: [
            { role: "user", content: prompt }
        ]
    }
    const uri = `https://${azure.resourceName}.openai.azure.com/openai/deployments/${azure.gpt4}/chat/completions?api-version=${azure.version}`;

    return new Promise(resolve => {
        request.post(
            uri,
            {
                headers: {
                    "Content-Type": "application/json",
                    "api-key": azure.apiKey
                },
                json: payload
            },
            (err, res) => {
                if (err) {
                    resolve(`Error: ${err}`);
                }

                if (res.statusCode == 200) {
                    const data = res.body;
                    const text = data['choices'][0]['message']['content'];
                    resolve(text);
                } else {
                    resolve("");
                }
            }
        );
    });

}

router.post("/generate/job-description", async (req, res) => {
    const {
        jobTitle = '',
        skills = [],
        extras = ''
    } = req.body;

    const prompt = `
    Please generate a job description for a ${jobTitle}. 
    The ideal candidate should have experience in ${skills.join()}. 
    ${extras}.
    Please include the job responsibilities and required qualifications.`

    const result = await chatGPTAzure(prompt);
    res.send(result);
});

router.get('/test-download-pdf', async (req, res) => {
    const drive = google.drive({ version: 'v3', auth: OAuth2ClientInstance.instance });

    drive.files.list((err, response) => {
        if (err) {
            console.error('Error listing files:', err);
            res.send('Error listing files');
        }
        const files = response.data.files;
        if (files.length) {
            const pdfFileId = files.filter(file => file.mimeType == 'application/pdf')[0].id;
            const dest = fs.createWriteStream("test.pdf");
            drive.files.get(
                { fileId: pdfFileId, alt: "media" },
                { responseType: "stream" },
                (err, { data }) => {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    data
                        .on("end", () => console.log("Done."))
                        .on("error", (err) => {
                            console.log(err);
                            return process.exit();
                        })
                        .pipe(dest);
                }
            );

            res.send(`Files found:\n${files.map(file => `${file.name} (${file.id})`).join('\n')}`);
        } else {
            res.send('No files found.');
        }
    });
});

module.exports = router;
const express = require("express");
const request = require("request");

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

module.exports = router;
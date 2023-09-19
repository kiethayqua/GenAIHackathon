const express = require("express");
const request = require("request");
const { google } = require("googleapis");
const fs = require("fs");
const { convertPdfToText } = require("../../convertPdfToText");
const { verifyToken } = require("../middlewares/auth");
const { getOAuth2Client } = require('../utils/oauth2Client');
const User = require('../models/UserModel');
const JobDescription = require('../models/JobDescriptionModel');

const router = express.Router();

const azure = {
  apiKey: process.env.AZURE_API_KEY,
  version: "2023-05-15",
  resourceName: "momo-genai-17",
  gpt35: "gpt-35",
  gpt4: "gpt-4",
};

const chatGPTAzure = (prompt) => {
  prompt = prompt.replace("“", '"');
  const payload = {
    messages: [{ role: "user", content: prompt }],
  };
  const uri = `https://${azure.resourceName}.openai.azure.com/openai/deployments/${azure.gpt4}/chat/completions?api-version=${azure.version}`;

  return new Promise((resolve) => {
    request.post(
      uri,
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": azure.apiKey,
        },
        json: payload,
      },
      (err, res) => {
        if (err) {
          resolve(`Error: ${err}`);
        }

        if (res.statusCode == 200) {
          const data = res.body;
          const text = data["choices"][0]["message"]["content"];
          resolve(text);
        } else {
          resolve("");
        }
      }
    );
  });
};

router.post(
  "/generate/job-description",
  verifyToken,
  async (req, res) => {
    try {
      const { jobTitle = "", skills = [], extras = "" } = req.body;

      const prompt = `
      Please generate a job description for a ${jobTitle}. 
      The ideal candidate should have experience in ${skills.join()}. 
      ${extras}.
      Please include the job responsibilities and required qualifications.`;

      const result = await chatGPTAzure(prompt);
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials(req.body.token);
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      const googleUser = (await drive.about.get({ fields: 'user' })).data.user;
      const user = await User.findOne({ id: googleUser.permissionId });
      await JobDescription.create({
        jobTitle,
        data: result,
        createdBy: user,
        status: true,
        isDeleted: false
      });

      res.json({
        data: result
      });
    } catch (e) {
      res.status(500).send('Generate JD was failed!' + e);
    }
  });

router.post("/check-CV-for-job", async (req, res) => {
  const { jobTitle = "" } = req.body;
  console.log("jobTitle", jobTitle);
  const cvPrompt = await loadCVPrompt();
  console.log("cvPrompt", cvPrompt);

  const prompt = `
      I have a job with description: ${jobTitle}. 
      The candidate CV: ${cvPrompt}. 
      Check is this CV suitable for this job? Why?`;

  const result = await chatGPTAzure(prompt);
  res.send(result);
});

router.post(
  "/test-download-pdf",
  verifyToken,
  async (req, res) => {
    try {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials(req.body.token);
      const drive = google.drive({
        version: "v3",
        auth: oauth2Client,
      });

      drive.files.list((err, response) => {
        if (err) {
          console.error("Error listing files:", err);
          res.send("Error listing files");
        }
        const files = response.data.files;
        if (files.length) {
          const pdfFileId = files.filter(
            (file) => file.mimeType == "application/pdf"
          )[0].id;
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

          res.json(
            {
              message: `Files found:\n${files
                .map((file) => `${file.name} (${file.id})`)
                .join("\n")}`
            }
          );
        } else {
          res.json({ message: "No files found." });
        }
      });
    } catch (e) {
      res.status(500).send('Fail to download pdf!');
    }
  });

const loadCVPrompt = () => {
  const drive = google.drive({
    version: "v3",
    auth: OAuth2ClientInstance.instance,
  });

  return new Promise((resolve, reject) => {
    drive.files.list((err, response) => {
      const files = response.data.files;
      if (files.length) {
        const pdfFileId = files.filter(
          (file) => file.mimeType == "application/pdf"
        )[0].id;
        //   const dest = fs.createWriteStream("test.pdf");

        drive.files.get(
          { fileId: pdfFileId, alt: "media" },
          { responseType: "arraybuffer" },
          async (err, { data }) => {
            if (err) {
              console.log(err);
              resolve("");
            }
            const buffer = Buffer.from(data);
            const cvPrompt = await convertPdfToText(buffer);
            resolve(cvPrompt);
          }
        );
      } else {
      }
    });
  });
};

router.get("/check-cv-prompt", async (req, res) => {
  const drive = google.drive({
    version: "v3",
    auth: OAuth2ClientInstance.instance,
  });

  drive.files.list((err, response) => {
    if (err) {
      console.error("Error listing files:", err);
      res.send("Error listing files");
    }
    const files = response.data.files;
    if (files.length) {
      const pdfFileId = files.filter(
        (file) => file.mimeType == "application/pdf"
      )[0].id;
      //   const dest = fs.createWriteStream("test.pdf");

      drive.files.get(
        { fileId: pdfFileId, alt: "media" },
        { responseType: "arraybuffer" },
        async (err, { data }) => {
          if (err) {
            console.log(err);
            return;
          }
          console.log("data", data);
          const buffer = Buffer.from(data);
          const cvPrompt = await convertPdfToText(buffer);
          console.log("cvPrompt", cvPrompt);
          //   data
          //     .on("end", () => {})
          //     .on("error", (err) => {
          //       console.log(err);
          //       return process.exit();
          //     })
          //     .pipe((dest) => {
          //       console.log("dest", dest);
          //     });
        }
      );

      res.send(
        `Files found:\n${files
          .map((file) => `${file.name} (${file.id})`)
          .join("\n")}`
      );
    } else {
      res.send("No files found.");
    }
  });
});

router.get(
  '/generate-interview-questions',
  async (req, res) => {
    console.log(req.query);
    const jdId = req.query.jd;
    const jd = await JobDescription.findById(jdId);
    if (jd) {
      const prompt = `As a recruiter, my objective is to design a comprehensive set of interview questions that effectively illuminate the interviewees' proficiency with this job description:
      ${jd.data}.
      Can you assist me in creating an interview protocol with 10 multiple choices questions about the Responsibilities in job description and the expectation answer?`;
      const stringData = await chatGPTAzure(prompt);

      const prompt1 = `Please help me to convert this string: ${stringData} to the JSON string with structure:
      {
        "data": [
          {
            "question": // a string question,
            "options": // an array string,
            "correct_answer": // the index of correct answer
          }
        ]
      }
      `;
      const jsonData = await chatGPTAzure(prompt1);

      res.json(jsonData);
    } else {
      res.json({});
    }
  }
)

router.post(
  '/list/job-descriptions',
  verifyToken,
  async (req, res) => {
    const { id = null, status = null, token } = req.body;
    console.log(status)

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(token);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const googleUser = (await drive.about.get({ fields: 'user' })).data.user;
    const user = await User.findOne({ id: googleUser.permissionId });

    const jds = await JobDescription.find({
      createdBy: user,
      isDeleted: false,
      ...((typeof status == "boolean") ? { status } : {}),
      ...(id ? { id } : {})
    });

    res.json({
      data: jds || []
    });
  }
);

router.post(
  '/update/job-description',
  verifyToken,
  async (req, res) => {
    const {
      id,
      status = null,
      isDeleted = null,
      data = null,
      jobTitle = null
    } = req.body;

    const jd = await JobDescription.findById(id);
    if (!jd) {
      res.json({ message: 'Not existed!' });
    } else {
      if (typeof status == 'boolean') {
        jd.status = status;
      }
      if (typeof isDeleted == 'boolean') {
        jd.isDeleted = isDeleted;
      }
      if (!!data) {
        jd.data = data;
      }
      if (!!jobTitle) {
        jd.jobTitle = jobTitle;
      }
      await jd.save();
      res.json({ message: 'Success' });
    }
  }
);

module.exports = router;

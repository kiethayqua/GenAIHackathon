const express = require('express')
const request = require('request')
const { google } = require('googleapis')
const fs = require('fs')
const { verifyToken } = require('../middlewares/auth')
const { getOAuth2Client } = require('../utils/oauth2Client')
const User = require('../models/UserModel')
const JobDescription = require('../models/JobDescriptionModel')
const multer = require('multer')
const { convertPdfToText, getNumberResult } = require('../utils')
const upload = multer({ dest: 'uploads/' })

const router = express.Router()

const azure = {
  apiKey: process.env.AZURE_API_KEY,
  version: "2023-05-15",
  resourceName: "momo-genai-17-3",
  gpt35: "gpt-35",
  gpt4: "gpt-4",
};

const chatGPTAzure = (prompt) => {
  prompt = prompt.replace('“', '"')
  const payload = {
    messages: [{ role: 'user', content: prompt }],
  }
  const uri = `https://${azure.resourceName}.openai.azure.com/openai/deployments/${azure.gpt4}/chat/completions?api-version=${azure.version}`

  return new Promise((resolve) => {
    request.post(
      uri,
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': azure.apiKey,
        },
        json: payload,
      },
      (err, res) => {
        if (err) {
          resolve(`Error: ${err}`)
        }

        if (res.statusCode == 200) {
          const data = res.body
          const text = data['choices'][0]['message']['content']
          resolve(text)
        } else {
          resolve('')
        }
      }
    )
  })
}

const overviewCV = async (text) => {
  const prompt = `
  Please help me to summary this CV:
  
  ${text}
  
  Please include candidate responsibilities, qualifications, skills and years of experience.`;

  const result = await chatGPTAzure(prompt);
  return result;
}

router.post(
  '/generate/job-description',
  verifyToken,
  async (req, res) => {
    try {
      const { jobTitle = '', skills = [], extras = '' } = req.body;

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
      await JobDescription.create({ jobTitle, data: result, createdBy: user, status: true, isDeleted: false });

      res.json({ data: result })
    } catch (e) {
      res.status(500).send('Generate JD was failed!' + e);
    }
  })

router.post(
  '/list/drive-folders',
  verifyToken,
  async (req, res) => {
    try {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials(req.body.token);
      const drive = google.drive({
        version: 'v3',
        auth: oauth2Client,
      });

      const listData = await drive.files.list({
        q: `'root' in parents and mimeType='application/vnd.google-apps.folder'`,
      });
      const folders = listData.data.files?.map(file => ({
        id: file.id,
        folderName: file.name
      })) || [];

      res.json({ data: folders });
    } catch (e) {
      res.status(500).send('Get list folders was failed!' + e);
    }
  }
);

router.post(
  '/find-cvs-for-job',
  verifyToken,
  async (req, res) => {
    try {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials(req.body.token);
      const drive = google.drive({
        version: 'v3',
        auth: oauth2Client,
      });
      let { folderId, jdId, top } = req.body;
      top = Number(top) || 3;
      const jd = await JobDescription.findById(jdId);
      if (jd) {
        const response = await drive.files.list({
          q: `'${folderId}' in parents`,
        });
        const files = response.data.files;
        if (files.length) {
          const pdfFiles = files.filter(
            (file) => file.mimeType == 'application/pdf'
          );
          console.log(pdfFiles.length);
          let results = []
          while (pdfFiles.length > 0) {
            results.push(...await Promise.all(pdfFiles.splice(0, 5).map(async file => {
              const dataBuffer = await drive.files.get({ fileId: file.id, alt: 'media' }, { responseType: 'arraybuffer' });
              const text = await convertPdfToText(dataBuffer);
              const cvOverview = await overviewCV(text);
              const prompt = `
              Please assess the suitability of the candidate for the following job role (by percent):
              
              Job Description:
              ${jd.data.trim()}

              Candidate CV:
              ${cvOverview.trim()}

              Just give me only the result's number.
              `
              const result = await chatGPTAzure(prompt);
              return {
                url: `https://drive.google.com/file/d/${file.id}/view`,
                percent: getNumberResult(result)
              };
            })));
          }
          console.log('results ', results.length)
          res.json({ data: results.sort((a, b) => b.percent - a.percent).filter((rs) => rs.percent !== 0).slice(0, top) });
        } else {
          res.json({ data: [] });
        }
      } else {
        res.json({ data: [] });
      }
    } catch (e) {
      res.status(500).send('Find CVs for Job was failed!' + e);
    }
  })

router.post(
  '/find-jobs-for-cv',
  upload.single('file'),
  async (req, res) => {
    try {
      const data = fs.readFileSync(req.file.path)
      const cvText = await convertPdfToText(data)
      const cvOverview = await overviewCV(cvText)
      console.log(cvOverview)
      const oauth2Client = getOAuth2Client()
      let token = req.body.token;
      const top = Number(req.body.top) || 3;
      token = typeof token == 'string' ? JSON.parse(token) : token;
      oauth2Client.setCredentials(token);
      const drive = google.drive({
        version: 'v3',
        auth: oauth2Client,
      });
      const googleUser = (await drive.about.get({ fields: 'user' })).data.user;
      const user = await User.find({ id: googleUser.permissionId });
      const jobDescriptions = await JobDescription.find({ createdBy: user, isDeleted: false, status: true });
      const results = []
      while (jobDescriptions.length > 0) {
        results.push(...await Promise.all(jobDescriptions.splice(0, 5).map(async (jd) => {
          const { id, jobTitle, data } = jd
          const prompt = `
              I have a Job Description: 
              
              ${data}

              and the candidate CV:

              ${cvOverview}

              Please, help me to calculate matching between the CV and JD, the result in percent, just give me only the result's number`

          const result = await chatGPTAzure(prompt)
          return { id, jobTitle, percent: getNumberResult(result) }
        })))
      }

      //remove file after used
      fs.unlinkSync(req.file.path);
      res.json(results.sort((a, b) => b.percent - a.percent).filter((rs) => rs.percent !== 0).slice(0, top));
    } catch (e) {
      res.status(500).send('Find Jobs for CV was failed!' + e);
    }
  }
)

router.get(
  '/generate-interview-questions',
  async (req, res) => {
    try {
      const jdId = req.query.jd
      const jd = await JobDescription.findById(jdId)
      if (jd) {
        const prompt = `As a recruiter, my objective is to design a comprehensive set of interview questions that effectively illuminate the interviewees' proficiency with this job description:
        ${jd.data}.
        Can you assist me in creating an interview protocol with 10 multiple choices questions about the Responsibilities and the Qualifications in job description and the expectation answer?`
        const stringData = await chatGPTAzure(prompt)

        const prompt1 = `Please help me to convert this string: ${stringData} to the JSON string with structure:
        {
          "data": [
            {
              "question": // a string question,
              "options": // an array string,
              "correct_answers": // an array index of correct answer
            }
          ]
        }`;
        const data = await chatGPTAzure(prompt1) || "";
        const firstIndexOfBracket = data.indexOf("{");
        let lastIndexOfBracket = -1;
        for (let i = (data?.length || 0) - 1; i >= 0; i--) {
          if (data?.[i] === "}") {
            lastIndexOfBracket = i;
            break;
          }
        }
        const jsonData = data.substring(firstIndexOfBracket, lastIndexOfBracket + 1);

        res.json(JSON.parse(jsonData))
      } else {
        res.json({})
      }
    } catch (e) {
      res.status(500).send('Generate interview questions was failed!' + e);
    }
  })

router.post(
  '/list/job-descriptions',
  verifyToken,
  async (req, res) => {
    try {
      const { id = null, status = null, token } = req.body;
      console.log(status)

      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials(token);
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      const googleUser = (await drive.about.get({ fields: 'user' })).data.user;
      const user = await User.findOne({ id: googleUser.permissionId });

      let jds = [];

      if (id) {
        jds = [await JobDescription.findById(id)];
      } else {
        jds = await JobDescription.find({
          createdBy: user,
          isDeleted: false,
          ...((typeof status == "boolean") ? { status } : {}),
        });
      }

      res.json({
        data: jds || []
      });
    } catch (e) {
      res.status(500).send('Get list job descriptions was failed!' + e);
    }
  }
);

router.post(
  '/update/job-description',
  verifyToken,
  async (req, res) => {
    try {
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
      await jd.save()
      res.json({ message: 'Success' })
    } catch (e) {
      res.status(500).send('Update job description was failed!' + e);
    }
  }
)

module.exports = router

const express = require("express");
const { google } = require('googleapis');

const router = express.Router();

const REDIRECT_URI = 'http://localhost:9999/auth/google/callback';

const oAuth2Client = new google.auth.OAuth2(
    process.env.OAUTH2_CLIENT_ID,
    process.env.OAUTH2_CLIENT_SECRET,
    REDIRECT_URI
);

router.get(
    "/login/google",
    (req, res) => {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/drive']
        });
        res.redirect(authUrl);
    }
);

router.get(
    "/auth/google/callback",
    async (req, res) => {
        const code = req.query.code;
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        const drive = google.drive({ version: 'v3', auth: oAuth2Client });

        drive.files.list((err, response) => {
            if (err) {
                console.error('Error listing files:', err);
                res.send('Error listing files');
            }
            const files = response.data.files;
            if (files.length) {
                res.send(`Files found:\n${files.map(file => `${file.name} (${file.id})`).join('\n')}`);
            } else {
                res.send('No files found.');
            }
        });
    }
);

module.exports = router;
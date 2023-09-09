const express = require("express");
const { google } = require('googleapis');

const router = express.Router();
const oAuth2Client = new google.auth.OAuth2(
    '97371485076-mchmdrk00tdip983pjaaj2vrqvhmbat6.apps.googleusercontent.com',
    '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',
    'http://localhost:9999/auth/google/callback'
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
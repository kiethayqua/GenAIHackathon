const express = require("express");
const User = require('../models/UserModel');
const { getOAuth2Client } = require('../utils/oauth2Client');
const { google } = require("googleapis");


const router = express.Router();

router.get(
    "/login/google",
    (req, res) => {
        req.headers.authorization
        const authUrl = getOAuth2Client().generateAuthUrl({
            // access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/drive']
        });
        res.redirect(authUrl);
    }
);

router.get(
    "/auth/google/callback",
    async (req, res) => {
        const code = req.query.code;
        console.log("CODE: " + code);

        res.cookie("oauth2Code", code);

        // NOTE: the url of FE for action close sign in popup
        res.redirect("http://127.0.0.1:3010/redirect");
    }
);

router.post(
    "/auth/me",
    async (req, res) => {
        if (req.body.code == null) return res.status(400).send('Invalid Request');
        const oauth2Client = getOAuth2Client();
        oauth2Client.getToken(req.body.code, async (err, token) => {
            if (err) {
                console.error('Error retrieving access token', err);
                return res.status(400).send('Error retrieving access token');
            }
            oauth2Client.setCredentials(token);
            const drive = google.drive({ version: 'v3', auth: oauth2Client });
            const googleUser = (await drive.about.get({ fields: 'user' })).data.user;
            const defaultUser = {
                id: googleUser.permissionId,
                email: googleUser.emailAddress,
                avatar: googleUser.photoLink,
                name: googleUser.displayName
            }
            const user = await User.findOne({ id: googleUser.permissionId });
            if (!user) {
                await User.create(defaultUser);
            }

            res.json({
                token: token,
                user: defaultUser
            });
        });
    }
)

module.exports = router;
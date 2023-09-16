const express = require("express");
const User = require('../models/UserModel');
const { google } = require('googleapis');


const router = express.Router();

const REDIRECT_URI = 'http://localhost:9999/auth/google/callback';
const oauth2Client = new google.auth.OAuth2(
    process.env.OAUTH2_CLIENT_ID,
    process.env.OAUTH2_CLIENT_SECRET,
    REDIRECT_URI
);

router.get(
    "/login/google",
    (req, res) => {
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/drive']
        });
        console.log(authUrl);
        res.redirect(authUrl);
    }
);

router.get(
    "/auth/google/callback",
    async (req, res) => {
        const code = req.query.code;
        console.log("CODE: " + code);

        res.cookie("oauth2Code", code);
        res.redirect("http://127.0.0.1:3000/login/success.html");
    }
);

router.post(
    "/auth/me",
    async (req, res) => {
        if (req.body.code == null) return res.status(400).send('Invalid Request');
        oauth2Client.getToken(req.body.code, async (err, token) => {
            if (err) {
                console.error('Error retrieving access token', err);
                return res.status(400).send('Error retrieving access token');
            }

            res.send(token);
        });
    }
)

module.exports = router;
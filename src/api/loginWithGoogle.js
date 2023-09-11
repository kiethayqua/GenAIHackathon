const express = require("express");
const OAuth2ClientInstance = require("../auth/OAuth2ClientInstance");

const router = express.Router();

router.get(
    "/login/google",
    (req, res) => {
        const authUrl = OAuth2ClientInstance.instance.generateAuthUrl({
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
        const { tokens } = await OAuth2ClientInstance.instance.getToken(code);
        OAuth2ClientInstance.instance.setCredentials(tokens);

        res.send('Thanks for your login!');
    }
);

module.exports = router;
const { google } = require('googleapis');

const REDIRECT_URI = 'http://localhost:9999/auth/google/callback';

const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.OAUTH2_CLIENT_ID,
        process.env.OAUTH2_CLIENT_SECRET,
        REDIRECT_URI
    );
}

module.exports = { getOAuth2Client };
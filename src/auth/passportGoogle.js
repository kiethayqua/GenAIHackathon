const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const GOOGLE_CALLBACK_URL = "http://localhost:9999/auth/google/callback";

passport.use(
    new GoogleStrategy(
        {
            clientID: '97371485076-mchmdrk00tdip983pjaaj2vrqvhmbat6.apps.googleusercontent.com',
            clientSecret: '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',
            callbackURL: GOOGLE_CALLBACK_URL,
            passReqToCallback: true,
        },
        (req, accessToken, refreshToken, profile, cb) => {
            const defaultUser = {
                fullName: `${profile.name.givenName} ${profile.name.familyName}`,
                email: profile.emails[0].value,
                picture: profile.photos[0].value,
                googleId: profile.id,
            };

            return cb(null, defaultUser);
        }
    )
);

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});
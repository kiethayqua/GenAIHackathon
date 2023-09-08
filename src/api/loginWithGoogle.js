const express = require("express");
const passport = require("passport");

const router = express.Router();

const successLoginUrl = "http://localhost:9999/success";
const errorLoginUrl = "http://localhost:9999/error";

router.get(
    "/login/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        failureMessage: "Cannot login to Google, please try again later!",
        failureRedirect: errorLoginUrl,
        successRedirect: successLoginUrl,
    }),
    (req, res) => {
        res.send("Thank you for signing in!");
    }
);

module.exports = router;
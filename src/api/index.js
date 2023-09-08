const express = require("express");
const loginWithGoogleApi = require("./loginWithGoogle");
const loginViews = require('./loginViews');

const router = express.Router();

router.use(loginWithGoogleApi);
router.use(loginViews);

module.exports = router;
const express = require("express");
const loginWithGoogleApi = require("./loginWithGoogle");
const loginViews = require('./loginViews');
const mainFeatures = require('./mainFeatures');

const router = express.Router();

router.use(loginWithGoogleApi);
router.use(loginViews);
router.use(mainFeatures);

module.exports = router;
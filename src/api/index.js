const express = require("express");
const loginWithGoogleApi = require("./loginWithGoogle");
const mainFeatures = require('./mainFeatures');

const router = express.Router();

router.use(loginWithGoogleApi);
router.use(mainFeatures);

module.exports = router;
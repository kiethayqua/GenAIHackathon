const express = require("express");

const router = express.Router();

router.get('/error', (req, res) => {
    res.render("error");
});

router.get('/success', (req, res) => {
    res.render("success");
});

module.exports = router;
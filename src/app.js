const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
const cookieSession = require("cookie-session");

require('./database');

const api = require("./api");
const passport = require("passport");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(morgan('dev'));
app.use(helmet());
app.use(cors({ origin: process.env.APP_DOMAIN, credentials: true }));
app.use(express.json());
app.set('views', 'src/views')
app.set('view engine', 'ejs');

app.use(
    cookieSession({
        maxAge: 24 * 60 * 60 * 1000,
        keys: [process.env.COOKIE_KEY],
    })
);

app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
    res.json({
        message: "Hello World!",
    });
});

app.use(api);

module.exports = app;
const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI);

const api = require("./api");

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());
app.set('views', 'src/views')
app.set('view engine', 'ejs');

app.get("/", (req, res) => {
    res.json({
        message: "Hello World!",
    });
});

app.use(api);

module.exports = app;
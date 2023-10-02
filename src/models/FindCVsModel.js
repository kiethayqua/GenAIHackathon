const mongoose = require('mongoose');

const findCVsSchema = new mongoose.Schema({
    jobTitle: String,
    numberOfCVs: Number,
    data: String
});

const FindCVs = mongoose.model('FindCVs', findCVsSchema, 'findCVs');

module.exports = FindCVs;
const mongoose = require('mongoose');
const User = require('./UserModel');

const jobDescriptionSchema = new mongoose.Schema({
    createdBy: User.schema,
    data: String,
    jobTitle: String
});

const JobDescription = mongoose.model('JobDescription', jobDescriptionSchema, 'jobDescriptions');

module.exports = JobDescription;
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    id: String,
    email: String,
    avatar: String,
    name: String
});

const User = mongoose.model('User', userSchema, 'users');

module.exports = User;
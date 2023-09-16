var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    id: String,
    email: String,
    avatar: String,
    name: String
});

var User = mongoose.model('User', userSchema, 'users');

module.exports = User;
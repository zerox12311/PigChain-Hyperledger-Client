var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = new Schema({
    name: String,
    email: String,
    password: String,
    company: String,
});

mongoose.model('User', User);
mongoose.connect('', { useNewUrlParser: true });
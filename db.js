const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/user', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
console.log("db")
const postbackSchema = new mongoose.Schema({
    click: String,
    idfa: String,
    aaid: String,
    user_agent: String,
    os: String,
    os_version: String,
    app_version: String,
    country: String,
    event: String,
    timestamp: { type: Date, default: Date.now }
});
const Postback = mongoose.model('Postback', postbackSchema);

module.exports =Postback ;

const mongoose = require('mongoose');

const MONGODB_URI =  'mongodb+srv://pratik:Pkmty!23@cluster0.zo20xjv.mongodb.net/?retryWrites=true&w=majority&';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB successfully");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

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

module.exports = Postback;

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/user');
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;

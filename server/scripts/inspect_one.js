const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const mongoose = require('mongoose');

async function inspectDoc() {
  await connectDB();
  const q = await mongoose.connection.collection('questions').findOne({ _id: new mongoose.Types.ObjectId('6abd6b1b08a9fbaa43e3e938') });
  console.log('QUESTION:\n', q.questionText);
  console.log('\nEXPLANATION:\n', q.explanation);
  await mongoose.disconnect();
}

inspectDoc().catch(console.error);

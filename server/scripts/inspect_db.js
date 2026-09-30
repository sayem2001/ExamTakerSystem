const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const mongoose = require('mongoose');

async function inspect() {
  await connectDB();
  const qColl = mongoose.connection.collection('questions');
  const samples = await qColl.find({ questionText: { $regex: /ac\{/i } }).limit(5).toArray();
  console.log('Found with ac{ in questionText:', samples.length);
  samples.forEach(s => {
    console.log('ID:', s._id);
    console.log('TEXT:', JSON.stringify(s.questionText));
  });

  const samplesExpl = await qColl.find({ explanation: { $regex: /(?:ext|ac\{|imes)/i } }).limit(5).toArray();
  console.log('\nFound with ext/ac/imes in explanation:', samplesExpl.length);
  samplesExpl.forEach(s => {
    console.log('ID:', s._id);
    console.log('EXPL:', JSON.stringify(s.explanation ? s.explanation.slice(0, 150) : ''));
  });

  await mongoose.disconnect();
}

inspect().catch(console.error);

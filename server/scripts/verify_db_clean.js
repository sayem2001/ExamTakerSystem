const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const mongoose = require('mongoose');

async function verify() {
  await connectDB();
  const qColl = mongoose.connection.collection('questions');

  // Corrupted fractions:
  // 1. Literal \rac{ or \nac{
  // 2. ac{ not preceded by fr (e.g. ac{1}{2})
  const corruptedFracRegex = /(?:\\rac\{|\\nac\{|(?<!fr)ac\{)/i;

  const countAc = await qColl.countDocuments({
    $or: [
      { questionText: { $regex: /(?:\\rac\{|\\nac\{|(?<!fr)ac\{)/i } },
      { explanation: { $regex: /(?:\\rac\{|\\nac\{|(?<!fr)ac\{)/i } }
    ]
  });
  console.log('Remaining questions with corrupted fraction tokens (ac{ / \\rac{):', countAc);

  const countExt = await qColl.countDocuments({
    $or: [
      { questionText: { $regex: /\bext[A-Z]/ } },
      { explanation: { $regex: /\bext[A-Z]/ } }
    ]
  });
  console.log('Remaining questions with corrupted ext tokens:', countExt);

  const countImes = await qColl.countDocuments({
    $or: [
      { questionText: { $regex: /\bimes\b/i } },
      { explanation: { $regex: /\bimes\b/i } }
    ]
  });
  console.log('Remaining questions with corrupted imes tokens:', countImes);

  await mongoose.disconnect();
}

verify().catch(console.error);

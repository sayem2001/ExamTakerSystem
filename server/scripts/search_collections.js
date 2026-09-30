const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const mongoose = require('mongoose');

async function searchAll() {
  await connectDB();
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  for (const collInfo of collections) {
    const collName = collInfo.name;
    const coll = db.collection(collName);
    const docs = await coll.find({
      $or: [
        { questionText: { $regex: /A trader sells/i } },
        { "questions.questionText": { $regex: /A trader sells/i } },
        { "extractedSourceQuestions.questionText": { $regex: /A trader sells/i } },
        { questionText: { $regex: /chocolates at the rate/i } },
        { "questions.questionText": { $regex: /chocolates at the rate/i } },
        { "extractedSourceQuestions.questionText": { $regex: /chocolates at the rate/i } },
        { explanation: { $regex: /Average Profit per book/i } },
        { "questions.explanation": { $regex: /Average Profit per book/i } }
      ]
    }).toArray();

    if (docs.length > 0) {
      console.log(`\n=== Found ${docs.length} in collection '${collName}' ===`);
      docs.forEach(d => {
        console.log('Doc ID:', d._id);
        if (d.title) console.log('Title:', d.title);
        if (d.extractedSourceQuestions) console.log('Has extractedSourceQuestions:', d.extractedSourceQuestions.length);
        if (d.questions) console.log('Has questions:', d.questions.length);
        if (d.questionText) console.log('QuestionText:', d.questionText);
      });
    }
  }

  await mongoose.disconnect();
}

searchAll().catch(console.error);

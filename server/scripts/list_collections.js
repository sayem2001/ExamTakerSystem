const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const mongoose = require('mongoose');

async function checkCollections() {
  await connectDB();
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('Collections in database:');
  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`- ${c.name}: ${count} documents`);
  }
  await mongoose.disconnect();
}

checkCollections().catch(console.error);
